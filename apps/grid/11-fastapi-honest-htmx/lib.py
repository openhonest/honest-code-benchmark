"""Pure functions for the grid archetype. No I/O, no side effects, no classes."""

ROWS_PER_PAGE = 25

QUARTER_FIELDS = ("q1", "q2", "q3", "q4")


def filter_rows(rows: list[dict], category: str) -> list[dict]:
    if not category or category == "All":
        return rows
    return [r for r in rows if r["category"] == category]


def compute_totals(rows: list[dict]) -> dict:
    t = {"q1": 0.0, "q2": 0.0, "q3": 0.0, "q4": 0.0, "budgetTarget": 0.0}
    for r in rows:
        t["q1"] += r["q1"]
        t["q2"] += r["q2"]
        t["q3"] += r["q3"]
        t["q4"] += r["q4"]
        t["budgetTarget"] += r["budgetTarget"]
    t["total"] = t["q1"] + t["q2"] + t["q3"] + t["q4"]
    t["variance"] = t["total"] - t["budgetTarget"]
    return t


def row_total(row: dict) -> float:
    return row["q1"] + row["q2"] + row["q3"] + row["q4"]


def row_variance(row: dict) -> float:
    return row_total(row) - row["budgetTarget"]


def extract_categories(rows: list[dict]) -> list[str]:
    return sorted({r["category"] for r in rows})


def paginate(rows: list[dict], page: int) -> tuple[list[dict], int, int]:
    total = len(rows)
    total_pages = max(1, -(-total // ROWS_PER_PAGE))
    p = min(max(1, page), total_pages)
    start = (p - 1) * ROWS_PER_PAGE
    return rows[start : start + ROWS_PER_PAGE], p, total_pages


def toggle_row(selected: dict, row_id) -> dict:
    result = dict(selected)
    key = str(row_id)
    if key in result:
        del result[key]
    else:
        result[key] = True
    return result


def toggle_all_visible(selected: dict, visible_ids: list) -> dict:
    result = dict(selected)
    str_ids = [str(i) for i in visible_ids]
    all_selected = len(str_ids) > 0 and all(sid in result for sid in str_ids)
    if all_selected:
        for sid in str_ids:
            result.pop(sid, None)
    else:
        for sid in str_ids:
            result[sid] = True
    return result


def commit_edit(rows: list[dict], row_id: int, col: str, value: str) -> list[dict]:
    if col not in QUARTER_FIELDS:
        return rows
    result = []
    for r in rows:
        if r["id"] == row_id:
            updated = dict(r)
            try:
                updated[col] = float(value)
            except (ValueError, TypeError):
                pass
            result.append(updated)
        else:
            result.append(r)
    return result


def bulk_fill(rows: list[dict], selected: dict, quarter: str, value: float) -> list[dict]:
    if quarter not in QUARTER_FIELDS:
        return rows
    result = []
    for r in rows:
        if str(r["id"]) in selected:
            updated = dict(r)
            updated[quarter] = value
            result.append(updated)
        else:
            result.append(r)
    return result


def compute_view(
    rows: list[dict],
    category_filter: str,
    page: int,
    selected: dict,
) -> dict:
    categories = extract_categories(rows)
    filtered = filter_rows(rows, category_filter)
    totals = compute_totals(filtered)
    page_rows, current_page, total_pages = paginate(filtered, page)
    visible_ids = [r["id"] for r in page_rows]
    str_visible = [str(i) for i in visible_ids]
    all_visible_selected = len(str_visible) > 0 and all(sid in selected for sid in str_visible)
    return {
        "page_rows": page_rows,
        "total_rows": len(filtered),
        "total_pages": total_pages,
        "page": current_page,
        "all_visible_selected": all_visible_selected,
        "sel_count": len(selected),
        "categories": categories,
        "totals": totals,
    }


def fmt(n: float) -> str:
    return f"{n:,.2f}"
