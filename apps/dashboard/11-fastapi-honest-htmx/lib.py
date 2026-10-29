"""Pure functions for the dashboard archetype. No I/O, no side effects, no classes."""

ROWS_PER_PAGE = 25

COLUMNS = (
    {"key": "id", "label": "Order ID"},
    {"key": "date", "label": "Date"},
    {"key": "customerName", "label": "Customer"},
    {"key": "category", "label": "Category"},
    {"key": "amount", "label": "Amount"},
    {"key": "status", "label": "Status"},
    {"key": "items", "label": "Items"},
)

SORT_COMPARATORS = {
    "str": lambda a, b: (str(a) > str(b)) - (str(a) < str(b)),
    "num": lambda a, b: (a > b) - (a < b),
}

COLUMN_TYPES = {
    "id": "str",
    "date": "str",
    "customerName": "str",
    "category": "str",
    "amount": "num",
    "status": "str",
    "items": "num",
}


def filter_rows(rows: list[dict], category: str, status: str, date_from: str, date_to: str) -> list[dict]:
    out = rows
    if category and category != "All":
        out = [r for r in out if r["category"] == category]
    if status and status != "All":
        out = [r for r in out if r["status"] == status]
    if date_from:
        out = [r for r in out if r["date"] >= date_from]
    if date_to:
        out = [r for r in out if r["date"] <= date_to]
    return out


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


def compute_metrics(rows: list[dict]) -> dict:
    total_orders = len(rows)
    total_revenue = sum(r["amount"] for r in rows)
    avg_order = total_revenue / total_orders if total_orders > 0 else 0
    unique_customers = len({r["customerName"] for r in rows})
    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "avg_order": avg_order,
        "unique_customers": unique_customers,
    }


def extract_filter_options(rows: list[dict]) -> dict:
    categories = sorted({r["category"] for r in rows})
    statuses = sorted({r["status"] for r in rows})
    return {"categories": categories, "statuses": statuses}


def compute_view(
    rows: list[dict],
    sort_col: str,
    sort_dir: str,
    category: str,
    status: str,
    date_from: str,
    date_to: str,
    page: int,
) -> dict:
    filtered = filter_rows(rows, category, status, date_from, date_to)
    metrics = compute_metrics(filtered)
    sorted_rows = sort_rows(filtered, sort_col, sort_dir)
    page_rows, current_page, total_pages = paginate(sorted_rows, page)
    return {
        "page_rows": page_rows,
        "total_rows": len(filtered),
        "total_pages": total_pages,
        "page": current_page,
        "metrics": metrics,
    }


def next_sort_state(current_col: str, current_dir: str, clicked_col: str) -> tuple[str, str]:
    if current_col == clicked_col:
        if current_dir == "asc":
            return clicked_col, "desc"
        return "", ""
    return clicked_col, "asc"
