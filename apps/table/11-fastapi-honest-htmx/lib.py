"""Pure functions for the table archetype. No I/O, no side effects, no classes."""

from typing import TypedDict

ROWS_PER_PAGE = 25

COLUMNS = (
    {"key": "name", "label": "Name"},
    {"key": "email", "label": "Email"},
    {"key": "department", "label": "Department"},
    {"key": "hireDate", "label": "Hire Date"},
    {"key": "salary", "label": "Salary"},
    {"key": "active", "label": "Active"},
)

SORT_COMPARATORS = {
    "str": lambda a, b: (a > b) - (a < b),
    "num": lambda a, b: (a > b) - (a < b),
    "bool": lambda a, b: (a > b) - (a < b),
}

COLUMN_TYPES = {
    "name": "str",
    "email": "str",
    "department": "str",
    "hireDate": "str",
    "salary": "num",
    "active": "bool",
}


def filter_rows(rows: list[dict], text: str) -> list[dict]:
    if not text:
        return rows
    ft = text.lower()
    return [
        r for r in rows
        if ft in r["name"].lower()
        or ft in r["email"].lower()
        or ft in r["department"].lower()
    ]


def sort_rows(rows: list[dict], col: str, direction: str) -> list[dict]:
    if not col or not direction:
        return rows
    col_type = COLUMN_TYPES.get(col, "str")
    comparator = SORT_COMPARATORS[col_type]
    reverse = direction == "desc"
    return sorted(rows, key=lambda r: r[col], reverse=reverse)


def paginate(rows: list[dict], page: int) -> tuple[list[dict], int, int]:
    total = len(rows)
    total_pages = max(1, -(-total // ROWS_PER_PAGE))
    p = min(max(1, page), total_pages)
    start = (p - 1) * ROWS_PER_PAGE
    return rows[start:start + ROWS_PER_PAGE], p, total_pages


def format_cell(value, col: str) -> str:
    if col == "salary":
        return f"${value:,}"
    if col == "active":
        return "Yes" if value else "No"
    return str(value)


def toggle_row(selected: dict, row_id: str) -> dict:
    result = dict(selected)
    if row_id in result:
        del result[row_id]
    else:
        result[row_id] = True
    return result


def toggle_all_visible(selected: dict, visible_ids: list[str]) -> dict:
    result = dict(selected)
    all_selected = all(rid in result for rid in visible_ids) and len(visible_ids) > 0
    if all_selected:
        for rid in visible_ids:
            result.pop(rid, None)
    else:
        for rid in visible_ids:
            result[rid] = True
    return result


def delete_selected(rows: list[dict], selected: dict) -> list[dict]:
    return [r for r in rows if r["id"] not in selected]


def commit_edit(rows: list[dict], row_id: str, col: str, value: str) -> list[dict]:
    result = []
    for r in rows:
        if r["id"] == row_id:
            updated = dict(r)
            if col == "salary":
                try:
                    updated[col] = int(value)
                except ValueError:
                    pass
            else:
                updated[col] = value
            result.append(updated)
        else:
            result.append(r)
    return result


def compute_view(
    rows: list[dict],
    sort_col: str,
    sort_dir: str,
    filter_text: str,
    page: int,
    selected: dict,
) -> dict:
    filtered = filter_rows(rows, filter_text)
    sorted_rows = sort_rows(filtered, sort_col, sort_dir)
    page_rows, current_page, total_pages = paginate(sorted_rows, page)
    visible_ids = [r["id"] for r in page_rows]
    all_visible_selected = (
        len(visible_ids) > 0 and all(rid in selected for rid in visible_ids)
    )
    return {
        "page_rows": page_rows,
        "total_rows": len(filtered),
        "total_pages": total_pages,
        "page": current_page,
        "all_visible_selected": all_visible_selected,
        "sel_count": len(selected),
    }


def next_sort_state(current_col: str, current_dir: str, clicked_col: str) -> tuple[str, str]:
    if current_col == clicked_col:
        if current_dir == "asc":
            return clicked_col, "desc"
        return "", ""
    return clicked_col, "asc"
