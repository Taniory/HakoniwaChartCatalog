from __future__ import annotations

import argparse
import hashlib
import os
import re
from datetime import date
from typing import Any

from pydantic import ValidationError

from scripts.common import KEBAB_CASE_RE, POSTS_DIR, STATE_DIR, Post, Safety, GeneratedBy, read_json, target_date_or_today, unique_post_path_for, utc_now_iso, write_json
from scripts.gemini_client import GeminiError, generate_json

DEFAULT_CONFIG: dict[str, Any] = {
    "chart_candidates": [
        "horizon-chart",
        "upset",
        "marimekko",
        "parallel-sets",
        "streamgraph",
        "contour-density",
    ],
    "repeat_window_days": 14,
    "max_repair_attempts": 2,
    "gemini_model": "gemini-2.5-flash",
}

POST_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "required": [
        "schema_version",
        "date",
        "title",
        "chart_id",
        "chart_name",
        "novelty_reason",
        "novelty_score",
        "repeat_risk",
        "near_duplicates",
        "fallback_candidates",
        "why_it_works",
        "how_to_read",
        "sample_data_json",
        "transform_js",
        "echarts_js",
        "custom_series_js",
        "safety",
        "generated_by",
    ],
    "properties": {
        "schema_version": {"type": "STRING"},
        "date": {"type": "STRING"},
        "title": {"type": "STRING"},
        "chart_id": {"type": "STRING"},
        "chart_name": {"type": "STRING"},
        "novelty_reason": {"type": "STRING"},
        "novelty_score": {"type": "INTEGER"},
        "repeat_risk": {"type": "STRING"},
        "near_duplicates": {"type": "ARRAY", "items": {"type": "STRING"}},
        "fallback_candidates": {"type": "ARRAY", "items": {"type": "STRING"}},
        "why_it_works": {"type": "STRING"},
        "how_to_read": {"type": "ARRAY", "items": {"type": "STRING"}},
        "sample_data_json": {
            "type": "OBJECT",
            "properties": {
                "rows": {"type": "ARRAY", "items": {"type": "OBJECT"}},
            },
        },
        "transform_js": {"type": "STRING"},
        "echarts_js": {"type": "STRING"},
        "custom_series_js": {"type": "STRING"},
        "paper": {
            "type": "OBJECT",
            "properties": {
                "title": {"type": "STRING"},
                "url": {"type": "STRING"},
                "year": {"type": "INTEGER"},
                "venue": {"type": "STRING"},
            },
        },
        "safety": {
            "type": "OBJECT",
            "required": ["validator_version", "attempts", "violations", "mode"],
            "properties": {
                "validator_version": {"type": "STRING"},
                "attempts": {"type": "INTEGER"},
                "violations": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "required": ["rule_id", "line", "excerpt"],
                        "properties": {
                            "rule_id": {"type": "STRING"},
                            "line": {"type": "INTEGER"},
                            "excerpt": {"type": "STRING"},
                        },
                    },
                },
                "mode": {"type": "STRING"},
            },
        },
        "generated_by": {
            "type": "OBJECT",
            "required": ["model", "generated_at"],
            "properties": {
                "model": {"type": "STRING"},
                "generated_at": {"type": "STRING"},
            },
        },
    },
}


def load_config() -> dict[str, Any]:
    config_path = STATE_DIR / "config.json"
    config = read_json(config_path, default=DEFAULT_CONFIG.copy())
    merged = DEFAULT_CONFIG.copy()
    merged.update(config)
    return merged


def load_history() -> dict[str, Any]:
    history_path = STATE_DIR / "history.json"
    history = read_json(history_path, default={"entries": []})
    if "entries" not in history or not isinstance(history["entries"], list):
        history["entries"] = []
    return history


def recent_chart_ids(history: dict[str, Any], target_date: str, days: int) -> list[str]:
    end = date.fromisoformat(target_date)
    ids: list[str] = []
    for row in history.get("entries", []):
        try:
            row_date = date.fromisoformat(row["date"])
        except Exception:
            continue
        delta_days = (end - row_date).days
        if 0 <= delta_days <= days:
            chart_id = row.get("chart_id")
            if isinstance(chart_id, str):
                ids.append(chart_id)
    deduped = list(dict.fromkeys(ids))
    return deduped[-20:]


def normalize_chart_ids(values: list[Any]) -> list[str]:
    normalized: list[str] = []
    for value in values:
        if not isinstance(value, str):
            continue
        item = value.strip()
        if not item:
            continue
        if not KEBAB_CASE_RE.fullmatch(item):
            continue
        normalized.append(item)
    return list(dict.fromkeys(normalized))


def parse_chart_ids_csv(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []
    parts = [part.strip() for part in raw_value.split(",")]
    return normalize_chart_ids(parts)


def env_flag_enabled(name: str) -> bool:
    value = os.environ.get(name, "")
    return value.strip().lower() in {"1", "true", "yes", "on"}


def choose_required_chart_id(
    *,
    target_date: str,
    chart_examples: list[str],
    blocked_ids: list[str],
    variant_seed: str | None,
) -> str | None:
    blocked = set(blocked_ids)
    available = [item for item in normalize_chart_ids(chart_examples) if item not in blocked]
    if not available:
        return None

    seed = variant_seed or target_date
    digest = hashlib.sha256(f"{target_date}:{seed}".encode("utf-8")).hexdigest()
    index = int(digest[:8], 16) % len(available)
    return available[index]


def chart_id_conflicts(
    chart_id: str,
    *,
    required_chart_id: str | None,
    blocked_ids: list[str],
) -> bool:
    if required_chart_id and chart_id != required_chart_id:
        return True
    return chart_id in set(blocked_ids)


PROMPT_PII_PATTERNS: tuple[tuple[str, str], ...] = (
    ("email", r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    ("phone", r"\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?){2,3}\d{3,4}\b"),
    ("us_ssn", r"\b\d{3}-\d{2}-\d{4}\b"),
    ("credit_card_like", r"\b(?:\d[ -]*?){13,19}\b"),
)


def find_prompt_pii(prompt: str) -> list[str]:
    hits: list[str] = []
    for label, pattern in PROMPT_PII_PATTERNS:
        if re.search(pattern, prompt):
            hits.append(label)
    return hits


def build_prompt(
    *,
    target_date: str,
    recent_ids: list[str],
    chart_examples: list[str],
    blocked_ids: list[str],
    required_chart_id: str | None,
) -> str:
    required_line = (
        f'- chart_id must be "{required_chart_id}".'
        if required_chart_id
        else "- chart_id should avoid recent ids when possible."
    )
    blocked_line = (
        f"- chart_id must not be any of these blocked ids: {blocked_ids}."
        if blocked_ids
        else "- blocked chart id list is empty."
    )
    return f"""
You are generating one Daily Uncommon Charts post as strict JSON.

Hard constraints:
- Output valid JSON only. No markdown.
- schema_version must be "1.1".
- date must be "{target_date}".
- chart_id must be kebab-case.
{required_line}
{blocked_line}
- chart_id does NOT need to be chosen from examples. You may freely propose a better uncommon chart id.
- Do not use dangerous APIs in JS: fetch, XMLHttpRequest, WebSocket, EventSource, sendBeacon, new Image, window.open, location assignment (including location.assign() and location.replace()), history.pushState, eval, Function, import(), importScripts, localStorage, sessionStorage, indexedDB, document.cookie, atob, btoa.
- Do not obfuscate code.
- Keep the chart type unchanged if repeat_risk is not high.

Required output keys:
schema_version, date, title, chart_id, chart_name, novelty_reason,
novelty_score, repeat_risk, near_duplicates, fallback_candidates,
why_it_works, how_to_read, sample_data_json, transform_js, echarts_js,
custom_series_js, paper, safety, generated_by.

Rules:
- 0 <= novelty_score <= 100
- repeat_risk must be one of: low, medium, high
- near_duplicates max length 3
- fallback_candidates max length 3
- sample_data_json must be a JSON object (not array/string). Recommended shape: {{"rows":[...]}}
- if repeat_risk == "high", fallback_candidates length must be 3, otherwise empty array recommended.
- safety.mode must be "render"
- safety.violations must be []
- safety.attempts must be 1
- generated_by.generated_at must be an ISO-8601 timestamp.
- transform_js / echarts_js / custom_series_js must each be valid JSON string values.
- how_to_read must be an array of Japanese strings (not a single string).

Recent chart ids (avoid duplicates): {recent_ids}
Blocked chart ids (do not use): {blocked_ids}
Required chart id for this run: {required_chart_id}
Chart id examples (for inspiration only, optional): {chart_examples}

JS execution order inside sandbox is:
1) transform_js
2) echarts_js
3) custom_series_js
You can use variables:
- rawData (input sample_data_json clone)
- transformedData (mutable)
- option (must become valid ECharts option object)
- post (current post object)
- echarts (ECharts runtime)

The generated chart should be uncommon yet easy to read.
All natural language fields must be written in Japanese.
""".strip()


def fallback_post(
    target_date: str,
    recent_ids: list[str],
    model_name: str,
    *,
    forced_chart_id: str | None = None,
    blocked_ids: list[str] | None = None,
) -> dict[str, Any]:
    choices = ["horizon-chart", "upset", "marimekko", "parallel-sets", "streamgraph"]
    blocked = set(blocked_ids or [])
    if forced_chart_id and KEBAB_CASE_RE.fullmatch(forced_chart_id):
        chart_id = forced_chart_id
    else:
        chart_id = next(
            (item for item in choices if item not in recent_ids and item not in blocked),
            next((item for item in choices if item not in blocked), choices[0]),
        )
    score = 72 + (sum(ord(ch) for ch in target_date) % 17)
    return {
        "schema_version": "1.1",
        "date": target_date,
        "title": "フォールバック生成: コンパクト異常値バー",
        "chart_id": chart_id,
        "chart_name": "コンパクト異常値バー",
        "novelty_reason": "限られた面積で異常値の上下を比較しやすい珍しい表現です。",
        "novelty_score": score,
        "repeat_risk": "medium" if chart_id in recent_ids or chart_id in blocked else "low",
        "near_duplicates": recent_ids[:3],
        "fallback_candidates": ["upset", "marimekko", "parallel-sets"] if chart_id in recent_ids else [],
        "why_it_works": "小さな領域でも符号付きの変化を保ち、ラベルと値を同時に読み取れます。",
        "how_to_read": [
            "各バーはゼロ基準の正負の偏差を表します。",
            "バーの高さを比較すると急な変化を素早く把握できます。",
        ],
        "sample_data_json": {
            "rows": [
                {"label": "A", "value": 7},
                {"label": "B", "value": -3},
                {"label": "C", "value": 5},
                {"label": "D", "value": -6},
            ]
        },
        "transform_js": "transformedData = rawData.rows.map((x) => ({ label: x.label, value: Number(x.value) }));",
        "echarts_js": "option = { xAxis: { type: 'category', data: transformedData.map((d) => d.label) }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: transformedData.map((d) => d.value) }] };",
        "custom_series_js": "",
        "paper": None,
        "safety": {
            "validator_version": "v0.1.0",
            "attempts": 1,
            "violations": [],
            "mode": "render",
        },
        "generated_by": {
            "model": model_name,
            "generated_at": utc_now_iso(),
        },
    }


def normalize_paper(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    title = str(value.get("title", "")).strip()
    url = str(value.get("url", "")).strip()
    venue = str(value.get("venue", "")).strip()
    year_raw = value.get("year")
    try:
        year = int(year_raw)
    except (TypeError, ValueError):
        return None
    if not title or not url or not venue:
        return None
    return {
        "title": title,
        "url": url,
        "year": year,
        "venue": venue,
    }


def normalize_payload(payload: dict[str, Any], *, model_name: str) -> dict[str, Any]:
    normalized = dict(payload)

    # paper は辞書以外（例: 文字列）の場合に無効化する
    normalized["paper"] = normalize_paper(normalized.get("paper"))

    safety_defaults = Safety().model_dump()
    safety_raw = normalized.get("safety")
    if isinstance(safety_raw, dict):
        merged_safety = dict(safety_defaults)
        merged_safety.update(safety_raw)
        normalized["safety"] = merged_safety
    else:
        normalized["safety"] = safety_defaults

    generated_defaults = GeneratedBy(model=model_name, generated_at=utc_now_iso()).model_dump()
    generated_raw = normalized.get("generated_by")
    if isinstance(generated_raw, dict):
        merged_generated = dict(generated_defaults)
        merged_generated.update(generated_raw)
        normalized["generated_by"] = merged_generated
    else:
        normalized["generated_by"] = generated_defaults

    return normalized


def save_history(history: dict[str, Any], target_date: str, chart_id: str) -> None:
    history["entries"] = [row for row in history.get("entries", []) if row.get("date") != target_date]
    history["entries"].append({"date": target_date, "chart_id": chart_id})
    history["entries"] = history["entries"][-365:]
    write_json(STATE_DIR / "history.json", history)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a daily post JSON")
    parser.add_argument("--date", dest="target_date", default=None, help="Target date in YYYY-MM-DD")
    parser.add_argument("--model", default=None, help="Gemini model name override")
    parser.add_argument("--variant-seed", default=None, help="Deterministic seed for chart variation")
    parser.add_argument("--forbid-chart-ids", default="", help="Comma-separated chart ids that must not be used")
    parser.add_argument("--print-prompt", action="store_true", help="Print Gemini prompt to logs")
    args = parser.parse_args()

    target_date = target_date_or_today(args.target_date)
    config = load_config()
    history = load_history()

    model_name = args.model or config.get("gemini_model", "gemini-2.5-flash")
    recent_ids = recent_chart_ids(history, target_date, int(config.get("repeat_window_days", 14)))
    forbidden_ids = parse_chart_ids_csv(args.forbid_chart_ids)
    blocked_ids = normalize_chart_ids([*recent_ids, *forbidden_ids])
    chart_candidates_raw = config.get("chart_candidates", [])
    if not isinstance(chart_candidates_raw, list):
        chart_candidates_raw = []
    chart_examples = normalize_chart_ids(chart_candidates_raw)
    required_chart_id = choose_required_chart_id(
        target_date=target_date,
        chart_examples=chart_examples,
        blocked_ids=blocked_ids,
        variant_seed=args.variant_seed,
    )
    print_prompt = args.print_prompt or env_flag_enabled("DAILY_CHARTS_LOG_PROMPT")
    if forbidden_ids:
        print(f"forbidden chart ids: {forbidden_ids}")
    if required_chart_id:
        print(f"required chart id: {required_chart_id}")

    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()

    if gemini_key:
        prompt = build_prompt(
            target_date=target_date,
            recent_ids=recent_ids,
            chart_examples=chart_examples,
            blocked_ids=blocked_ids,
            required_chart_id=required_chart_id,
        )
        pii_hits = find_prompt_pii(prompt)
        if pii_hits:
            labels = ", ".join(pii_hits)
            raise SystemExit(f"Prompt contains potential personal data ({labels}). Aborted before LLM call.")
        print("prompt privacy check: ok")
        if print_prompt:
            print("----- BEGIN GEMINI PROMPT -----")
            print(prompt)
            print("----- END GEMINI PROMPT -----")
        try:
            payload = generate_json(
                api_key=gemini_key,
                model=model_name,
                prompt=prompt,
                schema=POST_RESPONSE_SCHEMA,
                temperature=0.2,
            )
        except GeminiError:
            payload = generate_json(
                api_key=gemini_key,
                model=model_name,
                prompt=prompt,
                schema=None,
                temperature=0.2,
            )
    else:
        payload = fallback_post(
            target_date,
            recent_ids,
            "fallback-no-api-key",
            forced_chart_id=required_chart_id,
            blocked_ids=blocked_ids,
        )

    payload.setdefault("schema_version", "1.1")
    payload["date"] = target_date
    payload = normalize_payload(payload, model_name=model_name)
    generated_chart_id = str(payload.get("chart_id", "")).strip()
    if chart_id_conflicts(
        generated_chart_id,
        required_chart_id=required_chart_id,
        blocked_ids=blocked_ids,
    ):
        print("generated chart id conflicted with constraints; switching to deterministic fallback")
        payload = fallback_post(
            target_date,
            recent_ids,
            "fallback-constraint-guard",
            forced_chart_id=required_chart_id,
            blocked_ids=blocked_ids,
        )
        payload["date"] = target_date
        payload = normalize_payload(payload, model_name=model_name)

    try:
        post = Post.model_validate(payload)
    except ValidationError as exc:
        raise SystemExit(f"Generated post did not match schema: {exc}") from exc

    post_json = post.model_dump()
    output_path = unique_post_path_for(target_date)
    write_json(output_path, post_json)
    save_history(history, target_date, post.chart_id)
    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"wrote: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
