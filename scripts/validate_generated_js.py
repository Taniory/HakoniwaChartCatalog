from __future__ import annotations

import argparse
import json
from pathlib import Path

from scripts.common import Post, post_path_for, read_json, target_date_or_today, write_json
from scripts.validator_core import find_violations

VALIDATOR_VERSION = "v0.1.0"


def latest_post_path() -> Path:
    candidates = sorted(Path("site/posts").glob("*.json"), reverse=True)
    for item in candidates:
        if item.name == "index.json":
            continue
        return item
    raise FileNotFoundError("No post JSON found under site/posts/")


def resolve_post_path(target_date: str | None) -> Path:
    if target_date:
        return post_path_for(target_date)
    return latest_post_path()


def validate_post(post_payload: dict) -> tuple[dict, list[dict]]:
    post = Post.model_validate(post_payload)
    source = "\n".join(
        [
            post.transform_js or "",
            post.echarts_js or "",
            post.custom_series_js or "",
        ]
    )
    violations = find_violations(source)

    safety = post.safety.model_dump()
    safety["validator_version"] = VALIDATOR_VERSION
    safety["violations"] = violations
    safety["mode"] = "render" if not violations else "code_only"
    safety["attempts"] = max(int(safety.get("attempts", 1)), 1)

    post_payload["safety"] = safety
    return post_payload, violations


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate generated post JS for banned APIs")
    parser.add_argument("--date", default=None, help="Target date in YYYY-MM-DD")
    parser.add_argument(
        "--allow-violations",
        action="store_true",
        help="Return exit code 0 even if violations are present",
    )
    args = parser.parse_args()

    target_date = target_date_or_today(args.date) if args.date else None
    path = resolve_post_path(target_date)
    payload = read_json(path)
    updated, violations = validate_post(payload)
    write_json(path, updated)

    print(json.dumps({"path": str(path), "violations": violations}, ensure_ascii=False, indent=2))
    if violations and not args.allow_violations:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
