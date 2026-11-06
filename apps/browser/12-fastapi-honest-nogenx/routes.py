"""I/O boundary for browser archetype. Every handler: parse request, call pure functions, render template."""

import json
import sys
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from lib.sqlite_db import browser_page, browser_get, cached_read_only  # noqa: E402
from lib.http_util import BadRequest, int_param, require_id  # noqa: E402
from lib.timing import Timer  # noqa: E402

TEMPLATES = Path(__file__).parent / "templates"
jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATES)), autoescape=True)

COLUMNS = (
    {"key": "name", "label": "Name"},
    {"key": "status", "label": "Status"},
    {"key": "createdDate", "label": "Created"},
    {"key": "value", "label": "Value"},
)

STATUSES = ("active", "inactive", "pending", "archived", "flagged")

db = None


def next_sort_state(current_col: str, current_dir: str, clicked_col: str) -> tuple[str, str]:
    if current_col == clicked_col:
        if current_dir == "asc":
            return clicked_col, "desc"
        return "", ""
    return clicked_col, "asc"


def _parse_selected_id(raw: str) -> int | None:
    return int_param(raw, "selectedId", None)


def _parse_state(params: dict) -> dict:
    return {
        "sort_col": params.get("sortCol", ""),
        "sort_dir": params.get("sortDir", ""),
        "search": params.get("search", ""),
        "status_filter": params.get("statusFilter", "all"),
        "page": int_param(params.get("page"), "page"),
        "selected_id": _parse_selected_id(params.get("selectedId", "")),
    }


def _db():
    if db is None:
        raise BadRequest("load the page before sending partial requests")
    return db


def _render_content(state: dict, base_path: str, timer: Timer) -> str:
    conn = _db()
    result = timer.time("load", lambda: browser_page(
        conn,
        q=state["search"],
        status=state["status_filter"],
        col=state["sort_col"],
        dir=state["sort_dir"],
        page=state["page"],
    ))
    selected_record = None
    if state["selected_id"]:
        selected_record = timer.time("load", lambda: browser_get(conn, state["selected_id"]))
    tpl = jinja_env.get_template("_content.html")
    return timer.time("render", lambda: tpl.render(
        rows=result["rows"],
        total_rows=result["total"],
        total_pages=result["totalPages"],
        page=result["page"],
        sort_col=state["sort_col"],
        sort_dir=state["sort_dir"],
        search=state["search"],
        status_filter=state["status_filter"],
        selected_id=state["selected_id"] if state["selected_id"] is not None else "",
        selected_record=selected_record,
        columns=COLUMNS,
        statuses=STATUSES,
        base_path=base_path,
    ))


def render_page(sqlite_path: str, archetype: str, arm: str, rows: int, timer: Timer) -> str:
    # Opening the read-only connection is setup and is not timed; it is cached.
    global db
    db = cached_read_only(sqlite_path)
    base_path = f"/{archetype}/{arm}"
    state = {
        "sort_col": "", "sort_dir": "", "search": "",
        "status_filter": "all", "page": 1, "selected_id": None,
    }
    content_html = _render_content(state, base_path, timer)
    tpl = jinja_env.get_template("page.html")
    return timer.time("render", lambda: tpl.render(
        archetype=archetype, arm=arm, data_rows=rows, content_block=content_html,
    ))


def _content_response(state: dict, base_path: str) -> HTMLResponse:
    timer = Timer()
    html = _render_content(state, base_path, timer)
    return HTMLResponse(html, headers={"Server-Timing": timer.header()})


def create_router(archetype: str) -> APIRouter:
    router = APIRouter()
    base_path = f"/{archetype}/12-fastapi-honest-nogenx"

    @router.get("/search", response_class=HTMLResponse)
    async def search(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["search"] = params.get("searchInput", "")
        state["page"] = 1
        return _content_response(state, base_path)

    @router.get("/status-filter", response_class=HTMLResponse)
    async def status_filter(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["status_filter"] = params.get("status", "all")
        state["page"] = 1
        return _content_response(state, base_path)

    @router.get("/sort", response_class=HTMLResponse)
    async def sort(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        col = params.get("col", "")
        state["sort_col"], state["sort_dir"] = next_sort_state(
            state["sort_col"], state["sort_dir"], col
        )
        return _content_response(state, base_path)

    @router.get("/page", response_class=HTMLResponse)
    async def paginate(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["page"] = int_param(params.get("p"), "p")
        return _content_response(state, base_path)

    @router.get("/select", response_class=HTMLResponse)
    async def select(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["selected_id"] = require_id(params.get("id"))
        return _content_response(state, base_path)

    @router.get("/close-detail", response_class=HTMLResponse)
    async def close_detail(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["selected_id"] = None
        return _content_response(state, base_path)

    return router
