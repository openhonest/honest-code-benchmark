"""The value rule from lib/value-rules.js, applied in Python.

Salary: 1 to 9 ASCII digits, nothing else. Whole dollars.
Money:  an optional leading "-", 1 to 10 ASCII digits, and an optional "."
        followed by 1 or 2 ASCII digits. Stored as integer cents.
Anything else is rejected (None) and the old value is kept.
"""

import re

_SALARY_RE = re.compile(r"[0-9]{1,9}")
_MONEY_RE = re.compile(r"(-?)([0-9]{1,10})(?:\.([0-9]{1,2}))?")
_POSITIVE_INT_RE = re.compile(r"[1-9][0-9]{0,8}")


def parse_salary(raw):
    if not isinstance(raw, str) or not _SALARY_RE.fullmatch(raw):
        return None
    return int(raw)


def parse_money_cents(raw):
    if not isinstance(raw, str):
        return None
    m = _MONEY_RE.fullmatch(raw)
    if not m:
        return None
    cents = int(m.group(2)) * 100 + int((m.group(3) or "").ljust(2, "0"))
    return -cents if m.group(1) == "-" and cents != 0 else cents


def parse_positive_int(raw):
    if isinstance(raw, bool):
        return None
    if isinstance(raw, int):
        return raw if 0 < raw < 10**9 else None
    if not isinstance(raw, str) or not _POSITIVE_INT_RE.fullmatch(raw):
        return None
    return int(raw)
