"""I/O boundary for browser archetype. Every handler: parse request, call pure functions, render template."""

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

browser_data: list[dict] = []


def _parse_state(params: dict) -> dict:
    return {
        "sort_col": params.get("sortCol", ""),
        "sort_dir": params.get("sortDir", ""),
        "search": params.get("search", ""),
        "status_filter": params.get("statusFilter", "all"),
        "page": int(params.get("page", 1)),
        "selected_id": params.get("selectedId", ""),
    }


def _render_content(state: dict, base_path: str) -> str:
    view = lib.compute_view(
        browser_data,
        state["sort_col"],
        state["sort_dir"],
        state["search"],
        state["status_filter"],
        state["page"],
    )
    selected_record = None
    if state["selected_id"]:
        selected_record = lib.find_record(browser_data, state["selected_id"])
    tpl = jinja_env.get_template("_content.html")
    return tpl.render(
        rows=view["page_rows"],
        total_rows=view["total_rows"],
        total_pages=view["total_pages"],
        page=view["page"],
        sort_col=state["sort_col"],
        sort_dir=state["sort_dir"],
        search=state["search"],
        status_filter=state["status_filter"],
        selected_id=state["selected_id"],
        selected_record=selected_record,
        columns=lib.COLUMNS,
        statuses=lib.STATUSES,
        base_path=base_path,
    )


def render_page(data: list[dict], archetype: str, arm: str, rows: int) -> str:
    global browser_data
    browser_data = list(data)
    base_path = f"/{archetype}/{arm}"
    state = {
        "sort_col": "", "sort_dir": "", "search": "",
        "status_filter": "all", "page": 1, "selected_id": "",
    }
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

    @router.get("/search", response_class=HTMLResponse)
    async def search(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["search"] = params.get("searchInput", "")
        state["page"] = 1
        return _render_content(state, base_path)

    @router.get("/status-filter", response_class=HTMLResponse)
    async def status_filter(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["status_filter"] = params.get("status", "all")
        state["page"] = 1
        return _render_content(state, base_path)

    @router.get("/sort", response_class=HTMLResponse)
    async def sort(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        col = params.get("col", "")
        state["sort_col"], state["sort_dir"] = lib.next_sort_state(
            state["sort_col"], state["sort_dir"], col
        )
        return _render_content(state, base_path)

    @router.get("/page", response_class=HTMLResponse)
    async def paginate(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["page"] = int(params.get("p", 1))
        return _render_content(state, base_path)

    @router.get("/select", response_class=HTMLResponse)
    async def select(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["selected_id"] = params.get("id", "")
        return _render_content(state, base_path)

    @router.get("/close-detail", response_class=HTMLResponse)
    async def close_detail(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["selected_id"] = ""
        return _render_content(state, base_path)

    return router
