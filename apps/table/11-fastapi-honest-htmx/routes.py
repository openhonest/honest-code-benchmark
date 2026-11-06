"""I/O boundary for the table archetype. Every handler: parse the request,
call pure functions, render a template. Same protocol as Arm 10."""

import sys
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from lib.http_util import BadRequest, int_param, require_id, selection_json, selection_param  # noqa: E402
from lib.sqlite_db import TABLE_EDITABLE, WorkingCopy, table_delete, table_get, table_page, table_update  # noqa: E402
from lib.timing import Timer  # noqa: E402

TEMPLATES = Path(__file__).parent / "templates"
jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATES)), autoescape=True)

COLUMNS = (
    {"key": "name", "label": "Name"},
    {"key": "email", "label": "Email"},
    {"key": "department", "label": "Department"},
    {"key": "hireDate", "label": "Hire Date"},
    {"key": "salary", "label": "Salary"},
    {"key": "active", "label": "Active"},
)

working = None  # WorkingCopy opened by the last page load


def usd(n) -> str:
    return f"${n:,}"


def next_sort_state(current_col: str, current_dir: str, clicked_col: str) -> tuple[str, str]:
    if current_col == clicked_col:
        if current_dir == "asc":
            return clicked_col, "desc"
        return "", ""
    return clicked_col, "asc"


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
        "sort_col": params.get("sortCol", ""),
        "sort_dir": params.get("sortDir", ""),
        "filter_text": params.get("filter", ""),
        "page": int_param(params.get("page"), "page"),
        "selected": selection_param(params.get("selected")),
    }


def _db():
    if working is None:
        raise BadRequest("load the page before sending partial requests")
    return working.db


def _render_content(state: dict, base_path: str, timer: Timer) -> str:
    db = _db()
    result = timer.time("load", lambda: table_page(
        db, q=state["filter_text"], col=state["sort_col"], dir=state["sort_dir"], page=state["page"],
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
        sort_col=state["sort_col"],
        sort_dir=state["sort_dir"],
        filter_text=state["filter_text"],
        selected_ids=state["selected"],
        selected_json=selection_json(state["selected"]),
        columns=COLUMNS,
        editable=TABLE_EDITABLE,
        base_path=base_path,
        usd=usd,
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
    working = WorkingCopy(sqlite_path, "employees.sqlite")
    base_path = f"/{archetype}/{arm}"
    state = {"sort_col": "", "sort_dir": "", "filter_text": "", "page": 1, "selected": {}}
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
    base_path = f"/{archetype}/11-fastapi-honest-htmx"

    @router.get("/sort", response_class=HTMLResponse)
    async def sort(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["sort_col"], state["sort_dir"] = next_sort_state(
            state["sort_col"], state["sort_dir"], params.get("col", "")
        )
        return _content_response(state, base_path)

    @router.get("/filter", response_class=HTMLResponse)
    async def filter_rows(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["filter_text"] = params.get("filterInput", "")
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
        result = table_page(_db(), q=state["filter_text"], col=state["sort_col"], dir=state["sort_dir"], page=state["page"])
        state["selected"] = toggle_all_visible(state["selected"], [r["id"] for r in result["rows"]])
        return _content_response(state, base_path)

    @router.post("/delete", response_class=HTMLResponse)
    async def delete(request: Request):
        state = _parse_state(await _params(request))
        ids = sorted(state["selected"])
        if ids:
            table_delete(_db(), ids)
        state["selected"] = {}
        return _content_response(state, base_path)

    @router.get("/edit-cell", response_class=HTMLResponse)
    async def edit_cell(request: Request):
        row_id = require_id(request.query_params.get("id"))
        col = request.query_params.get("col", "")
        if col not in TABLE_EDITABLE:
            raise BadRequest("column is not editable")
        db = _db()
        timer = Timer()
        row = timer.time("load", lambda: table_get(db, row_id))
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
        if not table_update(_db(), row_id, col, params.get("editValue", "")):
            raise BadRequest("invalid edit")
        return _content_response(state, base_path)

    return router
