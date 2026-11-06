"""I/O boundary for form archetype. Every handler: parse request, call pure functions, render template."""

import json
import sys
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from lib.sqlite_db import form_first, cached_read_only  # noqa: E402
from lib.http_util import BadRequest, int_param  # noqa: E402
from lib.timing import Timer  # noqa: E402

TEMPLATES = Path(__file__).parent / "templates"
jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATES)), autoescape=True)

COUNTRIES = ("US", "CA", "MX", "GB", "DE", "FR", "JP", "AU", "BR", "IN")

US_STATES = (
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
)

FIELD_LABELS = {
    "firstName": "First Name",
    "lastName": "Last Name",
    "email": "Email",
    "phone": "Phone",
    "street": "Street",
    "city": "City",
    "state": "State",
    "zip": "ZIP",
    "country": "Country",
    "accountType": "Account Type",
    "companyName": "Company Name",
    "taxId": "Tax ID",
    "poNumber": "PO Number",
}

EMPTY_FIELDS = {
    "firstName": "",
    "lastName": "",
    "email": "",
    "phone": "",
    "street": "",
    "city": "",
    "state": "",
    "zip": "",
    "country": "",
    "accountType": "individual",
    "companyName": "",
    "taxId": "",
    "poNumber": "",
}

REQUIRED_BY_STEP = {
    1: ("firstName", "lastName", "email", "phone"),
    2: ("street", "city", "state", "zip", "country"),
    3: ("accountType",),
}

TOTAL_STEPS = 4


def prefill_from_record(rec: dict) -> dict:
    fields = {}
    for key, default in EMPTY_FIELDS.items():
        val = rec.get(key)
        fields[key] = val if val is not None else default
    return fields


def validate_step(step: int, fields: dict) -> dict:
    required = REQUIRED_BY_STEP.get(step, ())
    errors = {}
    for f in required:
        if not (fields.get(f) or "").strip():
            errors[f] = True
    if step == 3 and fields.get("accountType") == "business":
        if not (fields.get("companyName") or "").strip():
            errors["companyName"] = True
        if not (fields.get("taxId") or "").strip():
            errors["taxId"] = True
    return errors


def next_step(current: int) -> int:
    return min(current + 1, TOTAL_STEPS)


def prev_step(current: int) -> int:
    return max(current - 1, 1)


def parse_fields(params: dict) -> dict:
    fields = {}
    for key, default in EMPTY_FIELDS.items():
        fields[key] = params.get(key, default)
    return fields


def _parse_state(params: dict) -> dict:
    step = int_param(params.get("step"), "step")
    fields = parse_fields(params)
    if step > TOTAL_STEPS:
        raise BadRequest("step is out of range")
    errors_raw = params.get("errors") or "{}"
    try:
        errors = json.loads(errors_raw)
    except (json.JSONDecodeError, TypeError):
        raise BadRequest("errors must be JSON") from None
    if not isinstance(errors, dict):
        raise BadRequest("errors must be an object")
    return {"step": step, "fields": fields, "errors": errors}


def _render_content(state: dict, base_path: str, timer: Timer) -> str:
    tpl = jinja_env.get_template("_content.html")
    return timer.time("render", lambda: tpl.render(
        step=state["step"],
        fields=state["fields"],
        errors=state["errors"],
        errors_json=json.dumps(state["errors"]),
        base_path=base_path,
        countries=COUNTRIES,
        us_states=US_STATES,
        field_labels=FIELD_LABELS,
        total_steps=TOTAL_STEPS,
    ))


def render_page(sqlite_path: str, archetype: str, arm: str, rows: int, timer: Timer) -> str:
    # Opening the read-only connection is setup and is not timed; it is cached.
    db = cached_read_only(sqlite_path)
    first_rec = timer.time("load", lambda: form_first(db))
    base_path = f"/{archetype}/{arm}"
    fields = prefill_from_record(first_rec) if first_rec else dict(EMPTY_FIELDS)
    state = {"step": 1, "fields": fields, "errors": {}}
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
    base_path = f"/{archetype}/11-fastapi-honest-htmx"

    @router.get("/step", response_class=HTMLResponse)
    async def step(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["errors"] = {}
        return _content_response(state, base_path)

    @router.post("/next", response_class=HTMLResponse)
    async def go_next(request: Request):
        form = await request.form()
        params = {**dict(request.query_params), **dict(form)}
        state = _parse_state(params)
        errors = validate_step(state["step"], state["fields"])
        if errors:
            state["errors"] = errors
            return _content_response(state, base_path)
        state["step"] = next_step(state["step"])
        state["errors"] = {}
        return _content_response(state, base_path)

    @router.post("/prev", response_class=HTMLResponse)
    async def go_prev(request: Request):
        form = await request.form()
        params = {**dict(request.query_params), **dict(form)}
        state = _parse_state(params)
        state["step"] = prev_step(state["step"])
        state["errors"] = {}
        return _content_response(state, base_path)

    @router.post("/submit", response_class=HTMLResponse)
    async def submit(request: Request):
        return '<div id="form-content"><div class="form-step" data-step="done"><h2>Submitted</h2><p>Your form has been submitted.</p></div></div>'

    return router
