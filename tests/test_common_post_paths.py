import unittest
from datetime import datetime, timezone
from pathlib import Path
import shutil
import uuid

import scripts.common as common


class CommonPostPathTests(unittest.TestCase):
    def setUp(self) -> None:
        test_tmp_root = Path.cwd() / "tests" / "tmp_posts"
        test_tmp_root.mkdir(parents=True, exist_ok=True)
        self._tmp_dir = test_tmp_root / uuid.uuid4().hex
        self._tmp_dir.mkdir(parents=True, exist_ok=True)
        self._original_posts_dir = common.POSTS_DIR
        common.POSTS_DIR = self._tmp_dir

    def tearDown(self) -> None:
        common.POSTS_DIR = self._original_posts_dir
        shutil.rmtree(self._tmp_dir, ignore_errors=True)

    def _write_post_file(self, name: str) -> None:
        (common.POSTS_DIR / name).write_text("{}", encoding="utf-8", newline="\n")

    def test_latest_post_path_for_date_prefers_daily_file(self) -> None:
        self._write_post_file("2026-02-13.json")
        self._write_post_file("2026-02-13T091500Z.json")
        self._write_post_file("2026-02-13T101500Z.json")
        self._write_post_file("2026-02-12T235959Z.json")

        resolved = common.latest_post_path_for_date("2026-02-13")

        self.assertEqual(resolved.name, "2026-02-13.json")

    def test_latest_post_path_for_date_falls_back_to_latest_timestamp(self) -> None:
        self._write_post_file("2026-02-13T091500Z.json")
        self._write_post_file("2026-02-13T101500Z.json")
        self._write_post_file("2026-02-12T235959Z.json")

        resolved = common.latest_post_path_for_date("2026-02-13")

        self.assertEqual(resolved.name, "2026-02-13T101500Z.json")

    def test_unique_post_path_for_adds_sequence_when_same_second_exists(self) -> None:
        fixed_now = datetime(2026, 2, 13, 10, 15, 30, tzinfo=timezone.utc)
        self._write_post_file("2026-02-13T101530Z.json")
        self._write_post_file("2026-02-13T101530Z-01.json")

        resolved = common.unique_post_path_for("2026-02-13", now_utc=fixed_now)

        self.assertEqual(resolved.name, "2026-02-13T101530Z-02.json")

    def test_resolve_post_path_with_date_returns_latest_for_that_date(self) -> None:
        self._write_post_file("2026-02-13.json")
        self._write_post_file("2026-02-13T093000Z.json")
        self._write_post_file("2026-02-13T103000Z.json")
        self._write_post_file("2026-02-14T010000Z.json")

        resolved = common.resolve_post_path("2026-02-13")

        self.assertEqual(resolved.name, "2026-02-13.json")


if __name__ == "__main__":
    unittest.main()
