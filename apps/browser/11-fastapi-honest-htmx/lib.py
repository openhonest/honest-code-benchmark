"""Pure functions for the browser archetype. No I/O, no side effects, no classes."""

ROWS_PER_PAGE = 25

COLUMNS = (
    {"key": "name", "label": "Name"},
    {"key": "status", "label": "Status"},
    {"key": "createdDate", "label": "Created"},
    {"key": "value", "label": "Value"},
)

STATUSES = ("active", "inactive", "pending", "archived", "flagged")

SORT_COMPARATORS = {
    "str": lambda a, b: (str(a) > str(b)) - (str(a) < str(b)),
    "num": lambda a, b: (a > b) - (a < b),
}

COLUMN_TYPES = {
    "name": "str",
    "status": "str",
    "createdDate": "str",
    "value": "num",
}


def filter_rows(rows: list[dict], search: str, status_filter: str) -> list[dict]:
    result = rows
    if search:
        s = search.lower()
        result = [r for r in result if s in r["name"].lower()]
    if status_filter and status_filter != "all":
        result = [r for r in result if r["status"] == status_filter]
    return result


def sort_rows(rows: list[dict], col: str, direction: str) -> list[dict]:
    if not col or not direction:
        return rows
    reverse = direction == "desc"
    return sorted(rows, key=lambda r: r[col], reverse=reverse)


def paginate(rows: list[dict], page: int) -> tuple[list[dict], int, int]:
    total = len(rows)
    total_pages = max(1, -(-total // ROWS_PER_PAGE))
    p = min(max(1, page), total_pages)
    start = (p - 1) * ROWS_PER_PAGE
    return rows[start:start + ROWS_PER_PAGE], p, total_pages


def find_record(rows: list[dict], record_id: str) -> dict | None:
    for r in rows:
        if str(r["id"]) == str(record_id):
            return r
    return None


def compute_view(
    rows: list[dict],
    sort_col: str,
    sort_dir: str,
    search: str,
    status_filter: str,
    page: int,
) -> dict:
    filtered = filter_rows(rows, search, status_filter)
    sorted_rows = sort_rows(filtered, sort_col, sort_dir)
    page_rows, current_page, total_pages = paginate(sorted_rows, page)
    return {
        "page_rows": page_rows,
        "total_rows": len(filtered),
        "total_pages": total_pages,
        "page": current_page,
    }


def next_sort_state(current_col: str, current_dir: str, clicked_col: str) -> tuple[str, str]:
    if current_col == clicked_col:
        if current_dir == "asc":
            return clicked_col, "desc"
        return "", ""
    return clicked_col, "asc"
