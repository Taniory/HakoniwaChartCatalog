import unittest

from scripts.validator_core import find_violations


class ValidatorTests(unittest.TestCase):
    def test_detects_forbidden_network_api(self) -> None:
        source = "const a = 1;\nfetch('/api');\nconsole.log(a);"
        violations = find_violations(source)
        self.assertTrue(any(v["rule_id"] == "NET_FETCH" for v in violations))
        fetch_line = next(v["line"] for v in violations if v["rule_id"] == "NET_FETCH")
        self.assertEqual(fetch_line, 2)

    def test_detects_infinite_loop_pattern(self) -> None:
        source = "let x = 0;\nwhile(true){ x++; }\n"
        violations = find_violations(source)
        self.assertTrue(any(v["rule_id"] == "DOS_WHILE_TRUE" for v in violations))

    def test_detects_location_assign_and_replace_calls(self) -> None:
        source = "window.location.assign('https://example.com');\nlocation.replace('/next');"
        violations = find_violations(source)
        rule_ids = {v["rule_id"] for v in violations}
        self.assertIn("NAV_LOCATION_ASSIGN_CALL", rule_ids)
        self.assertIn("NAV_LOCATION_REPLACE_CALL", rule_ids)

    def test_allows_basic_safe_code(self) -> None:
        source = "transformedData = rawData.rows.map((r) => r.value);\noption = { series: [] };"
        violations = find_violations(source)
        self.assertEqual(violations, [])

    def test_detects_js_syntax_error(self) -> None:
        source = "const broken = );"
        violations = find_violations(source)
        self.assertTrue(any(v["rule_id"] == "JS_SYNTAX" for v in violations))


if __name__ == "__main__":
    unittest.main()
