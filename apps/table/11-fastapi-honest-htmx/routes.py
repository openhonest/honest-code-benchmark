"""I/O boundary for table archetype. Every handler: parse request, call pure functions, render template."""

import importlib.util
import json
import sys
from pathlib import Path
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader

_here = Path(__file__).parent
_lib_path = _here / "lib.py"
_mod_name = f"arm11_lib_{_here.parent.name}"
if _mod_name in sys.modules:
    lib = sys.modules[_mod_name]
else:
    _spec = importlib.util.spec_from_file_location(_mod_name, str(_lib_path))
    lib = importlib.util.module_from_spec(_spec)
    sys.modules[_mod_name] = lib
    _spec.loader.exec_module(lib)

TEMPLATES = Path(__file__).parent / "templates"
jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATES)), autoescape=True)

table_data: list[dict] = []


def _parse_state(params: dict) -> dict:
    selected_raw = params.get("selected", "{}")
    try:
        selected = json.loads(selected_raw)
    except (json.JSONDecodeError, TypeError):
        selected = {}
    return {
        "sort_col": params.get("sortCol", ""),
        "sort_dir": params.get("sortDir", ""),
        "filter_text": params.get("filter", ""),
        "page": int(params.get("page", 1)),
        "selected": selected,
    }


def _render_content(state: dict, base_path: str) -> str:
    view = lib.compute_view(
        table_data,
        state["sort_col"],
        state["sort_dir"],
        state["filter_text"],
        state["page"],
        state["selected"],
    )
    tpl = jinja_env.get_template("_content.html")
    return tpl.render(
        rows=view["page_rows"],
        total_rows=view["total_rows"],
        total_pages=view["total_pages"],
        page=view["page"],
        all_visible_selected=view["all_visible_selected"],
        sel_count=view["sel_count"],
        sort_col=state["sort_col"],
        sort_dir=state["sort_dir"],
        filter_text=state["filter_text"],
        selected_ids=state["selected"],
        selected_json=json.dumps(state["selected"]),
        columns=lib.COLUMNS,
        base_path=base_path,
    )


def render_page(data: list[dict], archetype: str, arm: str, rows: int) -> str:
    global table_data
    table_data = list(data)
    base_path = f"/{archetype}/{arm}"
    state = {"sort_col": "", "sort_dir": "", "filter_text": "", "page": 1, "selected": {}}
    content_html = _render_content(state, base_path)
    tpl = jinja_env.get_template("page.html")
    return tpl.render(
        archetype=archetype,
        arm=arm,
        data_rows=rows,
        content_block=content_html,
    )


def create_router(archetype: str) -> APIRouter:
    router = APIRouter()
    base_path = f"/{archetype}/11-fastapi-honest-htmx"

    @router.get("/sort", response_class=HTMLResponse)
    async def sort(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        col = params.get("col", "")
        state["sort_col"], state["sort_dir"] = lib.next_sort_state(
            state["sort_col"], state["sort_dir"], col
        )
        return _render_content(state, base_path)

    @router.get("/filter", response_class=HTMLResponse)
    async def filter_rows(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["filter_text"] = params.get("filterInput", "")
        state["page"] = 1
        return _render_content(state, base_path)

    @router.get("/page", response_class=HTMLResponse)
    async def paginate(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["page"] = int(params.get("p", 1))
        return _render_content(state, base_path)

    @router.post("/toggle", response_class=HTMLResponse)
    async def toggle(request: Request):
        form = await request.form()
        params = {**dict(request.query_params), **dict(form)}
        state = _parse_state(params)
        row_id = request.query_params.get("id", "")
        state["selected"] = lib.toggle_row(state["selected"], row_id)
        return _render_content(state, base_path)

    @router.post("/toggle-all", response_class=HTMLResponse)
    async def toggle_all(request: Request):
        form = await request.form()
        params = {**dict(request.query_params), **dict(form)}
        state = _parse_state(params)
        view = lib.compute_view(
            table_data,
            state["sort_col"], state["sort_dir"],
            state["filter_text"], state["page"],
            state["selected"],
        )
        visible_ids = [r["id"] for r in view["page_rows"]]
        state["selected"] = lib.toggle_all_visible(state["selected"], visible_ids)
        return _render_content(state, base_path)

    @router.post("/delete", response_class=HTMLResponse)
    async def delete(request: Request):
        global table_data
        form = await request.form()
        params = {**dict(request.query_params), **dict(form)}
        state = _parse_state(params)
        table_data = lib.delete_selected(table_data, state["selected"])
        state["selected"] = {}
        return _render_content(state, base_path)

    @router.get("/edit-cell", response_class=HTMLResponse)
    async def edit_cell(request: Request):
        row_id = request.query_params.get("id", "")
        col = request.query_params.get("col", "")
        row = next((r for r in table_data if r["id"] == row_id), None)
        if not row:
            return HTMLResponse("", status_code=404)
        tpl = jinja_env.get_template("_edit_cell.html")
        return tpl.render(id=row_id, col=col, value=row[col], base_path=base_path)

    @router.post("/commit-edit", response_class=HTMLResponse)
    async def commit_edit(request: Request):
        global table_data
        form = await request.form()
        params = {**dict(request.query_params), **dict(form)}
        state = _parse_state(params)
        row_id = request.query_params.get("id", "")
        col = request.query_params.get("col", "")
        value = params.get("editValue", "")
        table_data = lib.commit_edit(table_data, row_id, col, value)
        return _render_content(state, base_path)

    return router
