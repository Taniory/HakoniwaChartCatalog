from __future__ import annotations

import argparse
import json
import os
from typing import Any

from pydantic import BaseModel, ValidationError

from scripts.common import Post, read_json, resolve_post_path, target_date_or_today, utc_now_iso, write_json
from scripts.gemini_client import GeminiError, generate_json
from scripts.validator_core import find_violations


class RepairPayload(BaseModel):
    transform_js: str
    echarts_js: str
    custom_series_js: str


REPAIR_SCHEMA = {
    "type": "OBJECT",
    "required": ["transform_js", "echarts_js", "custom_series_js"],
    "properties": {
        "transform_js": {"type": "STRING"},
        "echarts_js": {"type": "STRING"},
        "custom_series_js": {"type": "STRING"},
    },
}

def run_validator(post_payload: dict) -> list[dict[str, Any]]:
    post = Post.model_validate(post_payload)
    source = "\n".join([post.transform_js, post.echarts_js, post.custom_series_js])
    return find_violations(source)


def build_repair_prompt(post_payload: dict, violations: list[dict[str, Any]]) -> str:
    return f"""
You are repairing JavaScript fields for a chart post JSON.
Return JSON only with keys: transform_js, echarts_js, custom_series_js.

Constraints:
- Keep chart type and semantics unchanged (chart_id = {post_payload.get("chart_id")}).
- Keep title and explanatory text unchanged.
- Do not use dangerous APIs: fetch, XMLHttpRequest, WebSocket, EventSource, sendBeacon, new Image, window.open, location assignment (including location.assign() and location.replace()), history.pushState, eval, Function, import(), importScripts, localStorage, sessionStorage, indexedDB, document.cookie, atob, btoa.
- No obfuscation, no dynamic code execution.
- Produce code compatible with ECharts sandbox runtime where variables are available:
  rawData, transformedData, option, post, echarts.

Current violations:
{json.dumps(violations, ensure_ascii=False, indent=2)}

Current code:
transform_js:
{post_payload.get("transform_js", "")}

echarts_js:
{post_payload.get("echarts_js", "")}

custom_series_js:
{post_payload.get("custom_series_js", "")}
""".strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="Repair generated JS fields using Gemini")
    parser.add_argument("--date", default=None, help="Target date in YYYY-MM-DD")
    parser.add_argument("--model", default="gemini-2.5-flash", help="Gemini model name")
    parser.add_argument("--max-attempts", type=int, default=2)
    args = parser.parse_args()

    target_date = target_date_or_today(args.date) if args.date else None
    path = resolve_post_path(target_date)
    payload = read_json(path)
    violations = run_validator(payload)
    if not violations:
        print("no violations; repair skipped")
        return 0

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        payload.setdefault("safety", {})
        payload["safety"]["mode"] = "code_only"
        payload["safety"]["violations"] = violations
        payload["safety"]["attempts"] = int(payload["safety"].get("attempts", 1))
        write_json(path, payload)
        print("GEMINI_API_KEY is missing; switched to code_only")
        return 2

    attempts = 0
    for attempt in range(1, args.max_attempts + 1):
        attempts = attempt
        prompt = build_repair_prompt(payload, violations)
        try:
            raw = generate_json(
                api_key=api_key,
                model=args.model,
                prompt=prompt,
                schema=REPAIR_SCHEMA,
                temperature=0.1,
            )
        except GeminiError:
            raw = generate_json(
                api_key=api_key,
                model=args.model,
                prompt=prompt,
                schema=None,
                temperature=0.1,
            )

        try:
            repaired = RepairPayload.model_validate(raw)
        except ValidationError:
            continue

        payload["transform_js"] = repaired.transform_js
        payload["echarts_js"] = repaired.echarts_js
        payload["custom_series_js"] = repaired.custom_series_js
        payload.setdefault("generated_by", {})
        payload["generated_by"]["generated_at"] = utc_now_iso()
        payload["generated_by"]["model"] = args.model

        violations = run_validator(payload)
        if not violations:
            payload.setdefault("safety", {})
            payload["safety"]["mode"] = "render"
            payload["safety"]["violations"] = []
            payload["safety"]["attempts"] = max(int(payload["safety"].get("attempts", 1)), attempts)
            write_json(path, payload)
            print(f"repaired successfully in {attempt} attempt(s)")
            return 0

    payload.setdefault("safety", {})
    payload["safety"]["mode"] = "code_only"
    payload["safety"]["violations"] = violations
    payload["safety"]["attempts"] = max(int(payload["safety"].get("attempts", 1)), attempts)
    write_json(path, payload)
    print("repair failed; left in code_only mode")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
