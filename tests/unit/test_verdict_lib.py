"""Pure-logic tests: no SDK, no network. Run: python -m unittest discover -s tests -v"""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "src"))
import verdict_lib as L  # noqa: E402

A, B, T = "0x" + "a" * 40, "0x" + "b" * 40, "0x" + "c" * 40
GEN = L.GEN


class Validation(unittest.TestCase):
    def test_urls_ok(self):
        self.assertEqual(L.validate_evidence_urls('["https://bbc.com/x", "https://bbc.com/x"]'), ["https://bbc.com/x"])

    def test_urls_rejected(self):
        for bad in ['[]', 'nope', '["http://a.com"]', '["https://localhost/x"]', '["https://127.0.0.1/"]',
                    '["https://192.168.1.4/"]', '["https://10.0.0.1/"]', '["https://[::1]/"]',
                    '["https://a.com/ x"]', '[1]', '["https://nodot/"]', '["https://' + "a" * 600 + '.com"]',
                    json.dumps(["https://a%d.com" % i for i in range(5)])]:
            with self.assertRaises(L.VerdictValidationError, msg=bad):
                L.validate_evidence_urls(bad)

    def test_text_bounds(self):
        with self.assertRaises(L.VerdictValidationError): L.validate_title("ab")
        with self.assertRaises(L.VerdictValidationError): L.validate_statement("short")
        with self.assertRaises(L.VerdictValidationError): L.validate_note("x" * 601)
        self.assertEqual(L.validate_title("  hello   world "), "hello world")

    def test_bond(self):
        self.assertEqual(L.validate_bond(GEN, GEN), GEN)
        with self.assertRaises(L.VerdictValidationError): L.validate_bond(GEN - 1, GEN)


class Evidence(unittest.TestCase):
    def test_normalize(self):
        r = L.normalize_evidence("https://a.com", 200, "<html><title>T</title><script>x()</script><p>" + "word " * 30 + "</p></html>")
        self.assertTrue(r["ok"]); self.assertEqual(r["title"], "T"); self.assertNotIn("x()", r["excerpt"])

    def test_bad_status_and_empty(self):
        self.assertFalse(L.normalize_evidence("u", 404, "word " * 30)["ok"])
        self.assertFalse(L.normalize_evidence("u", 200, "<p>hi</p>")["ok"])
        self.assertFalse(L.normalize_evidence("u", 0, None)["ok"])

    def test_truncation_flagged(self):
        r = L.normalize_evidence("u", 200, "w " * 9000)
        self.assertEqual(len(r["excerpt"]), L.MAX_PAGE_CHARS); self.assertIn("truncated", r["limitations"])

    def test_prompt_marks_untrusted(self):
        recs = [L.normalize_evidence("https://a.com", 200, "word " * 30), L.normalize_evidence("https://b.com", 500, "")]
        p = L.build_prompt("t", "s", "", recs)
        self.assertIn("untrusted", p); self.assertIn("UNAVAILABLE", p)


class Canonicalize(unittest.TestCase):
    def v(self, raw, ok=True): return L.canonicalize_verdict(raw, ok)

    def test_clean(self):
        r = self.v('{"outcome":"true","confidence":90,"reasoning":"r","key_facts":["a"]}')
        self.assertEqual((r["outcome"], r["confidence"]), ("TRUE", 90))

    def test_fenced_and_chatty(self):
        r = self.v('Sure!\n```json\n{"outcome":"FALSE","confidence":"75"}\n```')
        self.assertEqual(r["outcome"], "FALSE")

    def test_garbage_collapses(self):
        for raw in ["", "lol", None, 5, "{bad", '{"outcome":"MAYBE"}', '{"outcome":"TRUE","confidence":"x"}']:
            self.assertEqual(self.v(raw)["outcome"], "UNRESOLVABLE", raw)

    def test_low_confidence_collapses(self):
        self.assertEqual(self.v('{"outcome":"TRUE","confidence":59}')["outcome"], "UNRESOLVABLE")

    def test_no_evidence_collapses(self):
        self.assertEqual(self.v('{"outcome":"TRUE","confidence":99}', ok=False)["outcome"], "UNRESOLVABLE")

    def test_clamped(self):
        self.assertEqual(self.v('{"outcome":"TRUE","confidence":9999}')["confidence"], 100)

    def test_equivalence(self):
        a = {"outcome": "TRUE", "confidence": 90, "claim_id": "X"}
        self.assertTrue(L.verdicts_equivalent(a, {**a, "confidence": 75}))
        self.assertFalse(L.verdicts_equivalent(a, {**a, "confidence": 60}))
        self.assertFalse(L.verdicts_equivalent(a, {**a, "outcome": "FALSE"}))
        self.assertFalse(L.verdicts_equivalent(a, {**a, "claim_id": "Y"}))
        self.assertFalse(L.verdicts_equivalent({"outcome": "NOPE"}, {"outcome": "NOPE"}))

    def test_bind(self):
        env = {"claim_id": "X", "evidence": [{"url": "https://a.com", "ok": True, "status": 200}, {"url": "https://evil.com", "ok": True}]}
        b = L.bind_envelope(env, "X", ["https://a.com"])
        self.assertTrue(b["bound"]); self.assertEqual([r["url"] for r in b["records"]], ["https://a.com"])
        self.assertFalse(L.bind_envelope(env, "Z", ["https://a.com"])["bound"])
        self.assertFalse(L.bind_envelope("x", "X", [])["bound"])


class Money(unittest.TestCase):
    def run_case(self, outcome, challenged):
        h, hb = (B, 3 * GEN) if challenged else ("", 0)
        r = L.settle(outcome, A, 2 * GEN, h, hb, T)
        self.assertEqual(sum(r["credits"].values()), 2 * GEN + hb, "money must be conserved")
        return r

    def test_conservation_all_branches(self):
        for o in L.OUTCOMES:
            for c in (False, True):
                self.run_case(o, c)

    def test_true_challenged(self):
        r = self.run_case("TRUE", True)
        self.assertEqual(r["fee"], 3 * GEN * 200 // 10000)
        self.assertEqual(r["credits"][A], 5 * GEN - r["fee"]); self.assertEqual(r["credits"][T], r["fee"])

    def test_false_challenged(self):
        r = self.run_case("FALSE", True)
        self.assertEqual(r["credits"][B], 5 * GEN - r["fee"]); self.assertNotIn(A, r["credits"])

    def test_false_unchallenged_forfeits(self):
        self.assertEqual(self.run_case("FALSE", False)["credits"], {T: 2 * GEN})

    def test_unresolvable_refunds_exactly(self):
        r = self.run_case("UNRESOLVABLE", True)
        self.assertEqual(r["credits"], {A: 2 * GEN, B: 3 * GEN}); self.assertEqual(r["fee"], 0)

    def test_claimant_is_treasury(self):
        r = L.settle("TRUE", T, GEN, B, GEN, T)
        self.assertEqual(sum(r["credits"].values()), 2 * GEN)


if __name__ == "__main__":
    unittest.main()
