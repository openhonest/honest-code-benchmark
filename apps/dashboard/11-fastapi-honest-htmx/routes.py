"""I/O boundary for dashboard archetype. Every handler: parse request, call pure functions, render template."""

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

dashboard_data: list[dict] = []
all_filter_options: dict = {"categories": [], "statuses": []}


def _parse_state(params: dict) -> dict:
    return {
        "sort_col": params.get("sortCol", ""),
        "sort_dir": params.get("sortDir", ""),
        "category": params.get("category", "All"),
        "status": params.get("status", "All"),
        "date_from": params.get("dateFrom", ""),
        "date_to": params.get("dateTo", ""),
        "page": int(params.get("page", 1)),
    }


def _render_content(state: dict, base_path: str) -> str:
    view = lib.compute_view(
        dashboard_data,
        state["sort_col"],
        state["sort_dir"],
        state["category"],
        state["status"],
        state["date_from"],
        state["date_to"],
        state["page"],
    )
    tpl = jinja_env.get_template("_content.html")
    return tpl.render(
        rows=view["page_rows"],
        total_rows=view["total_rows"],
        total_pages=view["total_pages"],
        page=view["page"],
        metrics=view["metrics"],
        sort_col=state["sort_col"],
        sort_dir=state["sort_dir"],
        category=state["category"],
        status=state["status"],
        date_from=state["date_from"],
        date_to=state["date_to"],
        categories=all_filter_options["categories"],
        statuses=all_filter_options["statuses"],
        columns=lib.COLUMNS,
        base_path=base_path,
    )


def render_page(data: list[dict], archetype: str, arm: str, rows: int) -> str:
    global dashboard_data, all_filter_options
    dashboard_data = list(data)
    all_filter_options = lib.extract_filter_options(data)
    base_path = f"/{archetype}/{arm}"
    state = {
        "sort_col": "", "sort_dir": "",
        "category": "All", "status": "All",
        "date_from": "", "date_to": "",
        "page": 1,
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
        if "categoryInput" in params:
            state["category"] = params["categoryInput"]
        if "statusInput" in params:
            state["status"] = params["statusInput"]
        if "dateFromInput" in params:
            state["date_from"] = params["dateFromInput"]
        if "dateToInput" in params:
            state["date_to"] = params["dateToInput"]
        state["page"] = 1
        return _render_content(state, base_path)

    @router.get("/page", response_class=HTMLResponse)
    async def paginate(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["page"] = int(params.get("p", 1))
        return _render_content(state, base_path)

    return router
