"""I/O boundary for the grid archetype. Every handler: parse the request,
call pure functions, render a template. Same protocol as Arm 10."""

import sys
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from lib.http_util import BadRequest, int_param, require_id, selection_json, selection_param  # noqa: E402
from lib.sqlite_db import (  # noqa: E402
    GRID_QUARTERS, WorkingCopy, grid_bulk_fill, grid_categories, grid_get, grid_page, grid_totals, grid_update_cell,
)
from lib.timing import Timer  # noqa: E402

TEMPLATES = Path(__file__).parent / "templates"
jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATES)), autoescape=True)

QUARTERS = ("q1", "q2", "q3", "q4")

working = None  # WorkingCopy opened by the last page load


def fmt(n: float) -> str:
    return f"{n:,.2f}"


def row_total(row: dict) -> float:
    # Sum in integer cents, then convert, so the row total matches the footer.
    return sum(round(row[q] * 100) for q in QUARTERS) / 100


def toggle_row(selected: dict, row_id: int) -> dict:
    result = dict(selected)
    if row_id in result:
        del result[row_id]
    else:
        result[row_id] = True
    return result


def toggle_all_visible(selected: dict, visible_ids: list[int]) -> dict:
    result = dict(selected)
    if visible_ids and all(rid in result for rid in visible_ids):
        for rid in visible_ids:
            result.pop(rid, None)
    else:
        for rid in visible_ids:
            result[rid] = True
    return result


def _parse_state(params: dict) -> dict:
    return {
        "category_filter": params.get("categoryFilter") or "All",
        "page": int_param(params.get("page"), "page"),
        "selected": selection_param(params.get("selected")),
        "bulk_quarter": params.get("bulkQuarter") or "q1",
        "bulk_value": params.get("bulkValue", ""),
    }


def _db():
    if working is None:
        raise BadRequest("load the page before sending partial requests")
    return working.db


def _render_content(state: dict, base_path: str, timer: Timer) -> str:
    db = _db()
    cat = state["category_filter"]
    result, totals, categories = timer.time("load", lambda: (
        grid_page(db, category=cat, page=state["page"]),
        grid_totals(db, category=cat),
        grid_categories(db),
    ))
    visible_ids = [r["id"] for r in result["rows"]]
    all_visible_selected = bool(visible_ids) and all(rid in state["selected"] for rid in visible_ids)
    tpl = jinja_env.get_template("_content.html")
    return timer.time("render", lambda: tpl.render(
        rows=result["rows"],
        total_rows=result["total"],
        total_pages=result["totalPages"],
        page=result["page"],
        all_visible_selected=all_visible_selected,
        sel_count=len(state["selected"]),
        categories=categories,
        totals=totals,
        category_filter=cat,
        selected_ids=state["selected"],
        selected_json=selection_json(state["selected"]),
        bulk_quarter=state["bulk_quarter"],
        bulk_value=state["bulk_value"],
        quarters=QUARTERS,
        base_path=base_path,
        fmt=fmt,
        row_total=row_total,
    ))


def _content_response(state: dict, base_path: str) -> HTMLResponse:
    timer = Timer()
    html = _render_content(state, base_path, timer)
    return HTMLResponse(html, headers={"Server-Timing": timer.header()})


def render_page(sqlite_path: str, archetype: str, arm: str, rows: int, timer: Timer) -> str:
    # Opening the working copy is setup and is not timed. Each page load gets
    # a fresh copy of the pristine database; the previous copy is removed.
    global working
    if working is not None:
        working.dispose()
    working = WorkingCopy(sqlite_path, "budget.sqlite")
    base_path = f"/{archetype}/{arm}"
    state = {"category_filter": "All", "page": 1, "selected": {}, "bulk_quarter": "q1", "bulk_value": ""}
    content_html = _render_content(state, base_path, timer)
    tpl = jinja_env.get_template("page.html")
    return timer.time("render", lambda: tpl.render(
        archetype=archetype, arm=arm, data_rows=rows, content_block=content_html,
    ))


def close() -> None:
    global working
    if working is not None:
        working.dispose()
        working = None


async def _params(request: Request) -> dict:
    form = await request.form()
    return {**dict(request.query_params), **dict(form)}


def create_router(archetype: str) -> APIRouter:
    router = APIRouter()
    base_path = f"/{archetype}/12-fastapi-honest-nogenx"

    @router.get("/filter", response_class=HTMLResponse)
    async def filter_grid(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["category_filter"] = params.get("cat") or "All"
        state["page"] = 1
        return _content_response(state, base_path)

    @router.get("/page", response_class=HTMLResponse)
    async def paginate(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["page"] = int_param(params.get("p"), "p")
        return _content_response(state, base_path)

    @router.post("/toggle", response_class=HTMLResponse)
    async def toggle(request: Request):
        state = _parse_state(await _params(request))
        state["selected"] = toggle_row(state["selected"], require_id(request.query_params.get("id")))
        return _content_response(state, base_path)

    @router.post("/toggle-all", response_class=HTMLResponse)
    async def toggle_all(request: Request):
        state = _parse_state(await _params(request))
        result = grid_page(_db(), category=state["category_filter"], page=state["page"])
        state["selected"] = toggle_all_visible(state["selected"], [r["id"] for r in result["rows"]])
        return _content_response(state, base_path)

    @router.get("/edit-cell", response_class=HTMLResponse)
    async def edit_cell(request: Request):
        row_id = require_id(request.query_params.get("id"))
        col = request.query_params.get("col", "")
        if col not in GRID_QUARTERS:
            raise BadRequest("column is not editable")
        db = _db()
        timer = Timer()
        row = timer.time("load", lambda: grid_get(db, row_id))
        if not row:
            return HTMLResponse("", status_code=404)
        tpl = jinja_env.get_template("_edit_cell.html")
        html = timer.time("render", lambda: tpl.render(id=row_id, col=col, value=row[col], base_path=base_path))
        return HTMLResponse(html, headers={"Server-Timing": timer.header()})

    @router.post("/commit-edit", response_class=HTMLResponse)
    async def commit_edit(request: Request):
        params = await _params(request)
        state = _parse_state(params)
        row_id = require_id(request.query_params.get("id"))
        col = request.query_params.get("col", "")
        if not grid_update_cell(_db(), row_id, col, params.get("editValue", "")):
            raise BadRequest("invalid cell value")
        return _content_response(state, base_path)

    @router.post("/bulk-fill", response_class=HTMLResponse)
    async def bulk_fill(request: Request):
        state = _parse_state(await _params(request))
        ids = sorted(state["selected"])
        if ids and not grid_bulk_fill(_db(), ids, state["bulk_quarter"], state["bulk_value"]):
            raise BadRequest("invalid bulk value")
        return _content_response(state, base_path)

    return router
