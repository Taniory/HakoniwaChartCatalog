from __future__ import annotations

import json
from pathlib import Path

from scripts.common import Post, POSTS_DIR, write_json


def main() -> int:
    rows: list[dict] = []
    for path in sorted(POSTS_DIR.glob("*.json"), reverse=True):
        if path.name == "index.json":
            continue
        with path.open("r", encoding="utf-8") as fh:
            payload = json.load(fh)
        post = Post.model_validate(payload)
        rows.append(
            {
                "date": post.date,
                "title": post.title,
                "path": f"./posts/{path.name}",
                "chart_id": post.chart_id,
                "mode": post.safety.mode,
            }
        )

    rows.sort(key=lambda item: item["date"], reverse=True)
    write_json(POSTS_DIR / "index.json", rows)
    print(f"wrote: {POSTS_DIR / 'index.json'} ({len(rows)} entries)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
