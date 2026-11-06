"""python -m unittest discover -s tests (run from apps/)."""

import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "lib"))
from value_rules import parse_money_cents, parse_positive_int, parse_salary  # noqa: E402

CASES = json.loads((pathlib.Path(__file__).parent / "value-rules-cases.json").read_text("utf-8"))
FNS = {"salary": parse_salary, "money": parse_money_cents, "positiveInt": parse_positive_int}


class ValueRules(unittest.TestCase):
    def test_cases(self):
        for kind, items in CASES.items():
            for raw, expected in items:
                with self.subTest(kind=kind, raw=raw):
                    self.assertEqual(FNS[kind](raw), expected)


if __name__ == "__main__":
    unittest.main()
