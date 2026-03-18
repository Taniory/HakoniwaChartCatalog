from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

# Add project root to sys.path to resolve 'scripts' module
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.common import Post, POSTS_DIR, write_json


def generated_timestamp(value: str) -> float:
    if not value:
        return 0.0
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0.0


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
                "post_id": path.stem,
                "date": post.date,
                "generated_at": post.generated_by.generated_at,
                "title": post.title,
                "path": f"./posts/{path.name}",
                "chart_id": post.chart_id,
                "tags": post.tags,
                "aliases": post.aliases,
                "mode": post.safety.mode,
                "thumbnail": f"thumbnails/{path.stem}.webp",
                "_generated_ts": generated_timestamp(post.generated_by.generated_at),
            }
        )

    rows.sort(
        key=lambda item: (
            str(item.get("date", "")),
            float(item.get("_generated_ts", 0.0)),
            str(item.get("path", "")),
        ),
        reverse=False,
    )
    for row in rows:
        row.pop("_generated_ts", None)
    write_json(POSTS_DIR / "index.json", rows)
    print(f"wrote: {POSTS_DIR / 'index.json'} ({len(rows)} entries)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
