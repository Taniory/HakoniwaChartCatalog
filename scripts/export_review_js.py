from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path

from scripts.common import Post, SITE_DIR, post_path_for, read_json, target_date_or_today


def latest_post_path() -> Path:
    candidates = sorted((SITE_DIR / "posts").glob("*.json"), reverse=True)
    for item in candidates:
        if item.name == "index.json":
            continue
        return item
    raise FileNotFoundError("No post JSON found under site/posts/")


def resolve_post_path(target_date: str | None) -> Path:
    if target_date:
        return post_path_for(target_date)
    return latest_post_path()


def _count_braces_outside_strings(line: str) -> int:
    in_single = False
    in_double = False
    in_template = False
    escaped = False
    delta = 0
    for ch in line:
        if escaped:
            escaped = False
            continue
        if ch == "\\":
            escaped = True
            continue
        if in_single:
            if ch == "'":
                in_single = False
            continue
        if in_double:
            if ch == '"':
                in_double = False
            continue
        if in_template:
            if ch == "`":
                in_template = False
            continue
        if ch == "'":
            in_single = True
            continue
        if ch == '"':
            in_double = True
            continue
        if ch == "`":
            in_template = True
            continue
        if ch == "{":
            delta += 1
        elif ch == "}":
            delta -= 1
    return delta


def _split_js_into_lines(code: str) -> list[str]:
    lines: list[str] = []
    buf: list[str] = []
    in_single = False
    in_double = False
    in_template = False
    escaped = False

    for ch in code:
        buf.append(ch)
        if escaped:
            escaped = False
            continue
        if ch == "\\":
            escaped = True
            continue
        if in_single:
            if ch == "'":
                in_single = False
            continue
        if in_double:
            if ch == '"':
                in_double = False
            continue
        if in_template:
            if ch == "`":
                in_template = False
            continue
        if ch == "'":
            in_single = True
            continue
        if ch == '"':
            in_double = True
            continue
        if ch == "`":
            in_template = True
            continue

        if ch in {";", "{", "}", ","}:
            line = "".join(buf).strip()
            if line:
                lines.append(line)
            buf = []

    tail = "".join(buf).strip()
    if tail:
        lines.append(tail)

    merged: list[str] = []
    for line in lines:
        token = line.strip()
        if token in {",", ";"} and merged:
            merged[-1] = f"{merged[-1]}{token}"
            continue
        merged.append(line)
    return merged


def format_js_simple(code: str) -> str:
    raw_lines = _split_js_into_lines(code)
    if not raw_lines:
        return code.strip("\n")

    indent = 0
    formatted: list[str] = []
    for raw in raw_lines:
        line = raw.strip()
        if not line:
            continue
        if line.startswith("}"):
            indent = max(indent - 1, 0)
        formatted.append(("  " * indent) + line)
        indent = max(indent + _count_braces_outside_strings(line), 0)
    return "\n".join(formatted)


def format_js_for_review(code: str, *, use_prettier: bool) -> str:
    body = (code or "").strip("\n")
    if not body or not use_prettier:
        return body

    prettier_cmd: list[str] | None = None
    if shutil.which("npx"):
        prettier_cmd = ["npx", "--yes", "prettier@3.5.3", "--parser", "babel"]
    elif shutil.which("prettier"):
        prettier_cmd = ["prettier", "--parser", "babel"]

    if not prettier_cmd:
        return body

    try:
        completed = subprocess.run(
            prettier_cmd,
            input=body,
            text=True,
            capture_output=True,
            check=True,
        )
        return completed.stdout.strip("\n")
    except Exception:
        return format_js_simple(body)


def write_js(path: Path, section_name: str, code: str, *, date_text: str, chart_id: str) -> None:
    body = (code or "").strip("\n")
    if not body:
        body = "// (empty)"
    content = (
        f"// review export\n"
        f"// date: {date_text}\n"
        f"// chart_id: {chart_id}\n"
        f"// section: {section_name}\n\n"
        f"{body}\n"
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Export review friendly JS files from post JSON")
    parser.add_argument("--date", default=None, help="Target date in YYYY-MM-DD. Omit to use latest post.")
    parser.add_argument("--no-format", action="store_true", help="Do not run JS formatter for review files.")
    args = parser.parse_args()

    target_date = target_date_or_today(args.date) if args.date else None
    post_path = resolve_post_path(target_date)
    payload = read_json(post_path)
    post = Post.model_validate(payload)
    use_prettier = not args.no_format

    out_dir = SITE_DIR / "review" / post.date
    write_js(
        out_dir / "01_transform.js",
        "transform_js",
        format_js_for_review(post.transform_js, use_prettier=use_prettier),
        date_text=post.date,
        chart_id=post.chart_id,
    )
    write_js(
        out_dir / "02_echarts.js",
        "echarts_js",
        format_js_for_review(post.echarts_js, use_prettier=use_prettier),
        date_text=post.date,
        chart_id=post.chart_id,
    )
    write_js(
        out_dir / "03_custom_series.js",
        "custom_series_js",
        format_js_for_review(post.custom_series_js, use_prettier=use_prettier),
        date_text=post.date,
        chart_id=post.chart_id,
    )
    print(f"exported review JS: {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
