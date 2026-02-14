import unittest

from scripts.common import Post
from scripts.generate_daily_post import normalize_paper, normalize_payload, recent_chart_ids


class GenerateDailyPostNormalizationTests(unittest.TestCase):
    def _base_payload(self) -> dict:
        return {
            "schema_version": "1.1",
            "date": "2026-02-13",
            "title": "テスト投稿",
            "chart_id": "test-chart",
            "chart_name": "テストチャート",
            "novelty_reason": "理由",
            "novelty_score": 80,
            "repeat_risk": "low",
            "near_duplicates": [],
            "fallback_candidates": [],
            "why_it_works": "効く理由",
            "how_to_read": ["読み方1"],
            "sample_data_json": {"rows": [{"x": 1}]},
            "transform_js": "transformedData = rawData.rows;",
            "echarts_js": "option = { series: [] };",
            "custom_series_js": "",
            "paper": None,
            "safety": {
                "validator_version": "v0.1.0",
                "attempts": 1,
                "violations": [],
                "mode": "render",
            },
            "generated_by": {
                "model": "gemini-2.5-flash",
                "generated_at": "2026-02-13T00:00:00Z",
            },
        }

    def test_normalize_paper_returns_none_for_non_dict(self) -> None:
        self.assertIsNone(normalize_paper("Marimekko Chart"))

    def test_normalize_paper_accepts_valid_dict(self) -> None:
        paper = normalize_paper(
            {
                "title": "Some Paper",
                "url": "https://example.com/paper",
                "year": "2024",
                "venue": "VIS",
            }
        )
        self.assertEqual(
            paper,
            {
                "title": "Some Paper",
                "url": "https://example.com/paper",
                "year": 2024,
                "venue": "VIS",
            },
        )

    def test_normalize_payload_repairs_generated_by_and_paper(self) -> None:
        payload = self._base_payload()
        payload["paper"] = "Marimekko Chart"
        payload["generated_by"] = {"generated_at": "2024-07-30T12:00:00Z"}

        normalized = normalize_payload(payload, model_name="gemini-2.5-flash")

        self.assertIsNone(normalized["paper"])
        self.assertEqual(normalized["generated_by"]["model"], "gemini-2.5-flash")
        self.assertEqual(normalized["generated_by"]["generated_at"], "2024-07-30T12:00:00Z")

    def test_normalize_payload_result_passes_post_validation(self) -> None:
        payload = self._base_payload()
        payload["paper"] = {"title": "Only title"}
        payload["generated_by"] = {"generated_at": "2024-07-30T12:00:00Z"}
        payload["safety"] = {"mode": "render", "violations": [], "attempts": 1}

        normalized = normalize_payload(payload, model_name="gemini-2.5-flash")
        post = Post.model_validate(normalized)

        self.assertEqual(post.generated_by.model, "gemini-2.5-flash")
        self.assertIsNone(post.paper)
        self.assertEqual(post.safety.validator_version, "v0.1.0")

    def test_recent_chart_ids_excludes_future_dates(self) -> None:
        history = {
            "entries": [
                {"date": "2026-02-12", "chart_id": "past-1"},
                {"date": "2026-02-14", "chart_id": "future-1"},
                {"date": "2026-02-13", "chart_id": "same-day"},
            ]
        }
        ids = recent_chart_ids(history, "2026-02-13", 14)
        self.assertEqual(ids, ["past-1", "same-day"])


if __name__ == "__main__":
    unittest.main()
