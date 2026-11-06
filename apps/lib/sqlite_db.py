"""SQLite data access for Arm 11 (FastAPI). Mirror of lib/sqlite.js.

Sort rule (all arms): strings compare as ASCII lower case (SQLite NOCASE),
numbers numerically, booleans true first on ascending; ties break on
ascending id in both directions. Text filters use instr(), not LIKE.
Money is stored as integer cents and divided by 100 only when a row is mapped.
User-entered values go through lib/value_rules.py, the same rule as JavaScript.
"""

import json
import shutil
import sqlite3
import tempfile
from pathlib import Path

from .value_rules import parse_money_cents, parse_salary

ROWS_PER_PAGE = 25
READ_PRAGMAS = [
    "cache_size = -65536",
    "temp_store = MEMORY",
    "mmap_size = 268435456",
    "query_only = ON",
]
WRITE_PRAGMAS = [
    "cache_size = -65536",
    "temp_store = MEMORY",
    "journal_mode = WAL",
    "synchronous = OFF",
]


def _dict_factory(cur, row):
    return {c[0]: v for c, v in zip(cur.description, row)}


def open_read_only(path: str) -> sqlite3.Connection:
    db = sqlite3.connect(f"file:{path}?mode=ro", uri=True, check_same_thread=False)
    db.row_factory = _dict_factory
    for p in READ_PRAGMAS:
        db.execute(f"PRAGMA {p}")
    return db


_read_only_cache: dict[str, sqlite3.Connection] = {}


def cached_read_only(path: str) -> sqlite3.Connection:
    """One read-only connection per file, opened on first use and reused."""
    if path not in _read_only_cache:
        _read_only_cache[path] = open_read_only(path)
    return _read_only_cache[path]


def _open_rw(path: str) -> sqlite3.Connection:
    db = sqlite3.connect(path, check_same_thread=False)
    db.row_factory = _dict_factory
    for p in WRITE_PRAGMAS:
        db.execute(f"PRAGMA {p}")
    return db


# Row mappers: convert storage types back to JSON-compatible types
def _map_employee(r: dict) -> dict:
    return {**r, "active": r["active"] == 1}


def _map_order(r: dict) -> dict:
    return {**r, "amount": r["amount"] / 100}


def _map_browser(r: dict) -> dict:
    return {**r, "value": r["value"] / 100}


def _map_budget(r: dict) -> dict:
    return {
        **r,
        "q1": r["q1"] / 100,
        "q2": r["q2"] / 100,
        "q3": r["q3"] / 100,
        "q4": r["q4"] / 100,
        "budgetTarget": r["budgetTarget"] / 100,
    }


# Table (employees)
TABLE_SORTS = {
    "name": "name COLLATE NOCASE",
    "email": "email COLLATE NOCASE",
    "department": "department COLLATE NOCASE",
    "hireDate": "hireDate",
    "salary": "salary",
}
TABLE_ORDERS = {
    f"{k}:{d}": f"{e} {d.upper()}"
    for k, e in TABLE_SORTS.items()
    for d in ("asc", "desc")
}
TABLE_ORDERS["active:asc"] = "active DESC"
TABLE_ORDERS["active:desc"] = "active ASC"
TABLE_ORDERS[":"] = "id ASC"

TABLE_FILTER = """(:q = '' OR instr(lower(name), lower(:q)) > 0
  OR instr(lower(email), lower(:q)) > 0 OR instr(lower(department), lower(:q)) > 0)"""

TABLE_COUNT_SQL = f"SELECT count(*) AS n FROM employees WHERE {TABLE_FILTER}"
TABLE_PAGE_SQL = {
    k: f"SELECT * FROM employees WHERE {TABLE_FILTER} ORDER BY {o}, id ASC LIMIT {ROWS_PER_PAGE} OFFSET :offset"
    for k, o in TABLE_ORDERS.items()
}


def table_page(db: sqlite3.Connection, q: str = "", col: str = "", dir: str = "", page: int = 1) -> dict:
    total = db.execute(TABLE_COUNT_SQL, {"q": q}).fetchone()["n"]
    last = max(1, -(-total // ROWS_PER_PAGE))
    p = min(max(1, page), last)
    key = f"{col}:{dir}" if col else ":"
    sql = TABLE_PAGE_SQL.get(key, TABLE_PAGE_SQL[":"])
    rows = [_map_employee(r) for r in db.execute(sql, {"q": q, "offset": (p - 1) * ROWS_PER_PAGE})]
    return {"rows": rows, "page": p, "totalPages": last, "total": total}


def table_get(db: sqlite3.Connection, row_id: int) -> dict | None:
    r = db.execute("SELECT * FROM employees WHERE id = ?", (row_id,)).fetchone()
    return _map_employee(r) if r else None


TABLE_EDITABLE = frozenset({"name", "salary"})


def table_update(db: sqlite3.Connection, row_id: int, col: str, raw_value: str) -> bool:
    """Returns True only when a known column on an existing row was written."""
    if col not in TABLE_EDITABLE or not isinstance(raw_value, str):
        return False
    if col == "salary":
        salary = parse_salary(raw_value)
        if salary is None:
            return False
        cur = db.execute("UPDATE employees SET salary = ? WHERE id = ?", (salary, row_id))
    else:
        cur = db.execute("UPDATE employees SET name = ? WHERE id = ?", (raw_value, row_id))
    db.commit()
    return cur.rowcount == 1


def table_delete(db: sqlite3.Connection, ids: list[int]) -> int:
    ids = [i for i in ids if isinstance(i, int) and not isinstance(i, bool)]
    cur = db.execute("DELETE FROM employees WHERE id IN (SELECT value FROM json_each(?))", (json.dumps(ids),))
    db.commit()
    return cur.rowcount


# Dashboard (orders)
DASH_SORTS = {
    "id": "id",
    "date": "date",
    "customerName": "customerName COLLATE NOCASE",
    "category": "category COLLATE NOCASE",
    "amount": "amount",
    "status": "status COLLATE NOCASE",
    "items": "items",
}
DASH_ORDERS = {
    f"{k}:{d}": f"{e} {d.upper()}"
    for k, e in DASH_SORTS.items()
    for d in ("asc", "desc")
}
DASH_ORDERS[":"] = "id ASC"

DASH_FILTER = """(:category = 'All' OR category = :category)
  AND (:status = 'All' OR status = :status)
  AND (:dateFrom = '' OR date >= :dateFrom)
  AND (:dateTo = '' OR date <= :dateTo)"""

DASH_COUNT_SQL = f"SELECT count(*) AS n FROM orders WHERE {DASH_FILTER}"
DASH_PAGE_SQL = {
    k: f"SELECT * FROM orders WHERE {DASH_FILTER} ORDER BY {o}, id ASC LIMIT {ROWS_PER_PAGE} OFFSET :offset"
    for k, o in DASH_ORDERS.items()
}
DASH_AGG_SQL = f"SELECT count(*) AS total_orders, coalesce(sum(amount), 0) AS total_cents, count(DISTINCT customerName) AS unique_customers FROM orders WHERE {DASH_FILTER}"


def dashboard_page(
    db: sqlite3.Connection,
    category: str = "All",
    status: str = "All",
    date_from: str = "",
    date_to: str = "",
    col: str = "",
    dir: str = "",
    page: int = 1,
) -> dict:
    params = {"category": category, "status": status, "dateFrom": date_from, "dateTo": date_to}
    total = db.execute(DASH_COUNT_SQL, params).fetchone()["n"]
    last = max(1, -(-total // ROWS_PER_PAGE))
    p = min(max(1, page), last)
    key = f"{col}:{dir}" if col else ":"
    sql = DASH_PAGE_SQL.get(key, DASH_PAGE_SQL[":"])
    rows = [_map_order(r) for r in db.execute(sql, {**params, "offset": (p - 1) * ROWS_PER_PAGE})]
    agg = db.execute(DASH_AGG_SQL, params).fetchone()
    total_revenue = agg["total_cents"] / 100
    avg_order = agg["total_cents"] / 100 / agg["total_orders"] if agg["total_orders"] > 0 else 0
    return {
        "rows": rows,
        "page": p,
        "totalPages": last,
        "total": total,
        "totalRevenueCents": agg["total_cents"],
        "totalRevenue": total_revenue,
        "avgOrder": avg_order,
        "uniqueCustomers": agg["unique_customers"],
    }


def dashboard_categories(db: sqlite3.Connection) -> list[str]:
    return [r["category"] for r in db.execute("SELECT DISTINCT category FROM orders ORDER BY category COLLATE NOCASE, category")]


def dashboard_statuses(db: sqlite3.Connection) -> list[str]:
    return [r["status"] for r in db.execute("SELECT DISTINCT status FROM orders ORDER BY status COLLATE NOCASE, status")]


# Browser
BROWSER_SORTS = {
    "name": "name COLLATE NOCASE",
    "status": "status COLLATE NOCASE",
    "createdDate": "createdDate",
    "value": "value",
}
BROWSER_ORDERS = {
    f"{k}:{d}": f"{e} {d.upper()}"
    for k, e in BROWSER_SORTS.items()
    for d in ("asc", "desc")
}
BROWSER_ORDERS[":"] = "id ASC"

BROWSER_FILTER = """(:q = '' OR instr(lower(name), lower(:q)) > 0)
  AND (:status = 'all' OR status = :status)"""

BROWSER_COUNT_SQL = f"SELECT count(*) AS n FROM browser_records WHERE {BROWSER_FILTER}"
BROWSER_PAGE_SQL = {
    k: f"SELECT * FROM browser_records WHERE {BROWSER_FILTER} ORDER BY {o}, id ASC LIMIT {ROWS_PER_PAGE} OFFSET :offset"
    for k, o in BROWSER_ORDERS.items()
}


def browser_page(db: sqlite3.Connection, q: str = "", status: str = "all", col: str = "", dir: str = "", page: int = 1) -> dict:
    params = {"q": q, "status": status}
    total = db.execute(BROWSER_COUNT_SQL, params).fetchone()["n"]
    last = max(1, -(-total // ROWS_PER_PAGE))
    p = min(max(1, page), last)
    key = f"{col}:{dir}" if col else ":"
    sql = BROWSER_PAGE_SQL.get(key, BROWSER_PAGE_SQL[":"])
    rows = [_map_browser(r) for r in db.execute(sql, {**params, "offset": (p - 1) * ROWS_PER_PAGE})]
    return {"rows": rows, "page": p, "totalPages": last, "total": total}


def browser_get(db: sqlite3.Connection, row_id: int) -> dict | None:
    r = db.execute("SELECT * FROM browser_records WHERE id = ?", (row_id,)).fetchone()
    return _map_browser(r) if r else None


# Form (customers)
def form_first(db: sqlite3.Connection) -> dict | None:
    return db.execute("SELECT * FROM customers ORDER BY id LIMIT 1").fetchone()


# Grid (budget_lines)
GRID_FILTER = "(:category = 'All' OR category = :category)"
GRID_COUNT_SQL = f"SELECT count(*) AS n FROM budget_lines WHERE {GRID_FILTER}"
GRID_PAGE_SQL = f"SELECT * FROM budget_lines WHERE {GRID_FILTER} ORDER BY id ASC LIMIT {ROWS_PER_PAGE} OFFSET :offset"


def grid_page(db: sqlite3.Connection, category: str = "All", page: int = 1) -> dict:
    total = db.execute(GRID_COUNT_SQL, {"category": category}).fetchone()["n"]
    last = max(1, -(-total // ROWS_PER_PAGE))
    p = min(max(1, page), last)
    rows = [_map_budget(r) for r in db.execute(GRID_PAGE_SQL, {"category": category, "offset": (p - 1) * ROWS_PER_PAGE})]
    return {"rows": rows, "page": p, "totalPages": last, "total": total}


def grid_categories(db: sqlite3.Connection) -> list[str]:
    return [r["category"] for r in db.execute("SELECT DISTINCT category FROM budget_lines ORDER BY category COLLATE NOCASE, category")]


GRID_TOTALS_SQL = f"""SELECT coalesce(sum(q1), 0) AS q1, coalesce(sum(q2), 0) AS q2,
  coalesce(sum(q3), 0) AS q3, coalesce(sum(q4), 0) AS q4,
  coalesce(sum(budgetTarget), 0) AS budgetTarget
FROM budget_lines WHERE {GRID_FILTER}"""


def grid_totals(db: sqlite3.Connection, category: str = "All") -> dict:
    """Sums in integer cents first, then converts, exactly as lib/sqlite.js does."""
    r = db.execute(GRID_TOTALS_SQL, {"category": category}).fetchone()
    total_cents = r["q1"] + r["q2"] + r["q3"] + r["q4"]
    return {
        "cents": {
            "q1": r["q1"], "q2": r["q2"], "q3": r["q3"], "q4": r["q4"],
            "budgetTarget": r["budgetTarget"], "total": total_cents,
            "variance": total_cents - r["budgetTarget"],
        },
        "q1": r["q1"] / 100,
        "q2": r["q2"] / 100,
        "q3": r["q3"] / 100,
        "q4": r["q4"] / 100,
        "budgetTarget": r["budgetTarget"] / 100,
        "total": total_cents / 100,
        "variance": (total_cents - r["budgetTarget"]) / 100,
    }


def grid_get(db: sqlite3.Connection, row_id: int) -> dict | None:
    r = db.execute("SELECT * FROM budget_lines WHERE id = ?", (row_id,)).fetchone()
    return _map_budget(r) if r else None


GRID_QUARTERS = frozenset({"q1", "q2", "q3", "q4"})


def grid_update_cell(db: sqlite3.Connection, row_id: int, field: str, value: str) -> bool:
    """Returns True only when a quarter cell on an existing row was written."""
    cents = parse_money_cents(value)
    if field not in GRID_QUARTERS or cents is None:
        return False
    cur = db.execute(f"UPDATE budget_lines SET {field} = ? WHERE id = ?", (cents, row_id))
    db.commit()
    return cur.rowcount == 1


def grid_bulk_fill(db: sqlite3.Connection, ids: list[int], field: str, value: str) -> bool:
    cents = parse_money_cents(value)
    if field not in GRID_QUARTERS or cents is None:
        return False
    ids = [i for i in ids if isinstance(i, int) and not isinstance(i, bool)]
    db.execute(
        f"UPDATE budget_lines SET {field} = ? WHERE id IN (SELECT value FROM json_each(?))",
        (cents, json.dumps(ids)),
    )
    db.commit()
    return True


class WorkingCopy:
    """A per-page-load copy of a pristine database in its own temp directory.

    reset() restores the pristine file on a new connection; dispose() closes
    the connection and removes the directory. Same contract as lib/sqlite.js.
    """

    def __init__(self, pristine_path: str, file_name: str):
        self.pristine_path = pristine_path
        self.dir = tempfile.mkdtemp(prefix="bench-")
        self.path = str(Path(self.dir) / file_name)
        self.db = None
        self._connect()

    def _connect(self) -> None:
        shutil.copyfile(self.pristine_path, self.path)
        self.db = _open_rw(self.path)

    def reset(self) -> None:
        self.db.close()
        self._connect()

    def close(self) -> None:
        self.db.close()

    def dispose(self) -> None:
        try:
            self.db.close()
        except sqlite3.Error:
            pass
        shutil.rmtree(self.dir, ignore_errors=True)
