// One written rule for user-entered values, shared by every JavaScript arm
// (client and server). lib/value_rules.py applies the same rule in Python, and
// tests/value-rules-cases.json holds the input list both runtimes are tested on.
//
// Salary: 1 to 9 ASCII digits, nothing else. Whole dollars.
// Money:  an optional leading "-", 1 to 10 ASCII digits, and an optional "."
//         followed by 1 or 2 ASCII digits. Stored as integer cents.
// Anything else (empty, spaces, exponents, "Infinity", "NaN", non-ASCII digits,
// trailing text) is rejected and the old value is kept.

const SALARY_RE = /^[0-9]{1,9}$/;
const MONEY_RE = /^(-?)([0-9]{1,10})(?:\.([0-9]{1,2}))?$/;

export function parseSalary(raw) {
  if (typeof raw !== 'string' || !SALARY_RE.test(raw)) return null;
  return Number(raw);
}

export function parseMoneyCents(raw) {
  if (typeof raw !== 'string') return null;
  const m = MONEY_RE.exec(raw);
  if (!m) return null;
  const cents = Number(m[2]) * 100 + Number((m[3] || '').padEnd(2, '0'));
  return m[1] === '-' && cents !== 0 ? -cents : cents;
}

export function parseMoney(raw) {
  const cents = parseMoneyCents(raw);
  return cents === null ? null : cents / 100;
}

// Positive integer for ids and page numbers: 1 to 9 ASCII digits, no leading zero.
const POSITIVE_INT_RE = /^[1-9][0-9]{0,8}$/;

export function parsePositiveInt(raw) {
  if (typeof raw === 'number') return Number.isInteger(raw) && raw > 0 && raw < 1e9 ? raw : null;
  if (typeof raw !== 'string' || !POSITIVE_INT_RE.test(raw)) return null;
  return Number(raw);
}
