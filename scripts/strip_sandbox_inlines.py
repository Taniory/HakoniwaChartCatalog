"""
Strip inline bundles from `site/sandbox.html` and keep marker placeholders only.

Usage:
  python -m scripts.strip_sandbox_inlines
  python -m scripts.strip_sandbox_inlines --check
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from scripts.common import SITE_DIR

MARKERS = [
    ("/*__ECHARTS_INLINE_START__*/", "/*__ECHARTS_INLINE_END__*/"),
    ("/*__DOMPURIFY_INLINE_START__*/", "/*__DOMPURIFY_INLINE_END__*/"),
    (
        "/*__SANDBOX_SANITIZER_INLINE_START__*/",
        "/*__SANDBOX_SANITIZER_INLINE_END__*/",
    ),
]


def _strip_between_markers(content: str) -> str:
    patched = content
    for start, end in MARKERS:
        pattern = re.compile(rf"{re.escape(start)}.*?{re.escape(end)}", re.DOTALL)
        if not pattern.search(patched):
            raise SystemExit(f"Inline markers were not found: {start} ... {end}")
        replacement = f"{start}\n      {end}"
        patched = pattern.sub(lambda _m: replacement, patched, count=1)
    return patched


def main() -> int:
    parser = argparse.ArgumentParser(description="Strip inline bundles in sandbox.html")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Do not modify files; fail if inline bundle content exists.",
    )
    args = parser.parse_args()

    sandbox_path = SITE_DIR / "sandbox.html"
    original = sandbox_path.read_text(encoding="utf-8")
    stripped = _strip_between_markers(original)

    if args.check:
        if stripped != original:
            raise SystemExit(
                "sandbox.html still contains inline bundle content. "
                "Run: python -m scripts.strip_sandbox_inlines"
            )
        print("ok: sandbox.html inline sections are placeholders")
        return 0

    sandbox_path.write_text(stripped, encoding="utf-8", newline="\n")
    print(f"stripped inline bundles: {sandbox_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
