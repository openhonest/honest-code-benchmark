"""I/O boundary for dashboard archetype. Every handler: parse request, call pure functions, render template."""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from lib.sqlite_db import dashboard_page, dashboard_categories, dashboard_statuses, cached_read_only  # noqa: E402
from lib.http_util import BadRequest, int_param  # noqa: E402
from lib.timing import Timer  # noqa: E402

TEMPLATES = Path(__file__).parent / "templates"
jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATES)), autoescape=True)

COLUMNS = (
    {"key": "id", "label": "Order ID"},
    {"key": "date", "label": "Date"},
    {"key": "customerName", "label": "Customer"},
    {"key": "category", "label": "Category"},
    {"key": "amount", "label": "Amount"},
    {"key": "status", "label": "Status"},
    {"key": "items", "label": "Items"},
)

db = None
all_filter_options: dict = {"categories": [], "statuses": []}

REFRESH_EVENT = "dashboard-refresh"
DEFAULT_REFRESH_SECONDS = 60


def utc_now_iso() -> str:
    """The current UTC time as "2026-10-30T19:03:12.345Z", like JS toISOString()."""
    now = datetime.now(timezone.utc)
    return now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}Z"


def format_updated(iso: str) -> str:
    """'2026-10-30T19:03:12.345Z' -> '19:03:12 UTC'; empty input gives ''."""
    return f"{iso[11:19]} UTC" if iso else ""


def refresh_trigger(seconds: int) -> str:
    """Poll every N seconds plus the page-wide refresh event; N = 0 leaves only the event."""
    on_event = f"{REFRESH_EVENT} from:body"
    return f"every {seconds}s, {on_event}" if seconds > 0 else on_event


def next_sort_state(current_col: str, current_dir: str, clicked_col: str) -> tuple[str, str]:
    if current_col == clicked_col:
        if current_dir == "asc":
            return clicked_col, "desc"
        return "", ""
    return clicked_col, "asc"


def _parse_state(params: dict) -> dict:
    return {
        "sort_col": params.get("sortCol", ""),
        "sort_dir": params.get("sortDir", ""),
        "category": params.get("category", "All"),
        "status": params.get("status", "All"),
        "date_from": params.get("dateFrom", ""),
        "date_to": params.get("dateTo", ""),
        "page": int_param(params.get("page"), "page"),
    }


def _db():
    if db is None:
        raise BadRequest("load the page before sending partial requests")
    return db


def _render_content(state: dict, base_path: str, timer: Timer) -> str:
    conn = _db()
    loaded_at = utc_now_iso()
    result = timer.time("load", lambda: dashboard_page(
        conn,
        category=state["category"],
        status=state["status"],
        date_from=state["date_from"],
        date_to=state["date_to"],
        col=state["sort_col"],
        dir=state["sort_dir"],
        page=state["page"],
    ))
    metrics = {
        "total_orders": result["total"],
        "total_revenue": result["totalRevenue"],
        "avg_order": result["avgOrder"],
        "unique_customers": result["uniqueCustomers"],
    }
    tpl = jinja_env.get_template("_content.html")
    return timer.time("render", lambda: tpl.render(
        rows=result["rows"],
        total_rows=result["total"],
        total_pages=result["totalPages"],
        page=result["page"],
        metrics=metrics,
        sort_col=state["sort_col"],
        sort_dir=state["sort_dir"],
        category=state["category"],
        status=state["status"],
        date_from=state["date_from"],
        date_to=state["date_to"],
        categories=all_filter_options["categories"],
        statuses=all_filter_options["statuses"],
        columns=COLUMNS,
        base_path=base_path,
        loaded_at=loaded_at,
        updated_text=format_updated(loaded_at),
    ))


def render_page(sqlite_path: str, archetype: str, arm: str, rows: int, timer: Timer,
                refresh_seconds: int = DEFAULT_REFRESH_SECONDS) -> str:
    # Opening the read-only connection is setup and is not timed; it is cached.
    global db, all_filter_options
    db = cached_read_only(sqlite_path)
    base_path = f"/{archetype}/{arm}"
    state = {
        "sort_col": "", "sort_dir": "",
        "category": "All", "status": "All",
        "date_from": "", "date_to": "",
        "page": 1,
    }
    all_filter_options = timer.time("load", lambda: {
        "categories": dashboard_categories(db),
        "statuses": dashboard_statuses(db),
    })
    content_html = _render_content(state, base_path, timer)
    tpl = jinja_env.get_template("page.html")
    return timer.time("render", lambda: tpl.render(
        archetype=archetype, arm=arm, data_rows=rows, content_block=content_html,
        base_path=base_path, refresh_seconds=refresh_seconds,
        refresh_trigger=refresh_trigger(refresh_seconds),
    ))


def _content_response(state: dict, base_path: str) -> HTMLResponse:
    timer = Timer()
    html = _render_content(state, base_path, timer)
    return HTMLResponse(html, headers={"Server-Timing": timer.header()})


def create_router(archetype: str) -> APIRouter:
    router = APIRouter()
    base_path = f"/{archetype}/12-fastapi-honest-nogenx"

    @router.get("/sort", response_class=HTMLResponse)
    async def sort(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        col = params.get("col", "")
        state["sort_col"], state["sort_dir"] = next_sort_state(
            state["sort_col"], state["sort_dir"], col
        )
        return _content_response(state, base_path)

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
        return _content_response(state, base_path)

    # Auto-refresh: re-read the current state from SQLite. The state rides in
    # the hidden inputs and comes back unchanged, so filters, sort and page
    # survive (dashboard_page clamps the page if the data shrank).
    @router.get("/refresh", response_class=HTMLResponse)
    async def refresh(request: Request):
        return _content_response(_parse_state(dict(request.query_params)), base_path)

    @router.get("/page", response_class=HTMLResponse)
    async def paginate(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["page"] = int_param(params.get("p"), "p")
        return _content_response(state, base_path)

    return router
