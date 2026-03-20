import unittest

from scripts.common import Post


class PostSchemaTests(unittest.TestCase):
    def test_post_accepts_educational_fields(self) -> None:
        payload = {
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
            "how_to_read": ["読み方 1"],
            "when_to_use": ["向いている場面 1"],
            "when_not_to_use": ["避けたい場面 1"],
            "common_misreads": ["誤読しやすいポイント 1"],
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

        post = Post.model_validate(payload)

        self.assertEqual(post.when_to_use, ["向いている場面 1"])
        self.assertEqual(post.when_not_to_use, ["避けたい場面 1"])
        self.assertEqual(post.common_misreads, ["誤読しやすいポイント 1"])


if __name__ == "__main__":
    unittest.main()
