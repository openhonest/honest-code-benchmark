"""I/O boundary for form archetype. Every handler: parse request, call pure functions, render template."""

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

form_data: list[dict] = []


def _parse_state(params: dict) -> dict:
    step = int(params.get("step", 1))
    fields = lib.parse_fields(params)
    errors_raw = params.get("errors", "{}")
    try:
        errors = json.loads(errors_raw)
    except (json.JSONDecodeError, TypeError):
        errors = {}
    return {"step": step, "fields": fields, "errors": errors}


def _render_content(state: dict, base_path: str) -> str:
    tpl = jinja_env.get_template("_content.html")
    return tpl.render(
        step=state["step"],
        fields=state["fields"],
        errors=state["errors"],
        errors_json=json.dumps(state["errors"]),
        base_path=base_path,
        countries=lib.COUNTRIES,
        us_states=lib.US_STATES,
        field_labels=lib.FIELD_LABELS,
        total_steps=lib.TOTAL_STEPS,
    )


def render_page(data: list[dict], archetype: str, arm: str, rows: int) -> str:
    global form_data
    form_data = list(data)
    base_path = f"/{archetype}/{arm}"
    first_rec = form_data[0] if form_data else {}
    fields = lib.prefill_from_record(first_rec) if first_rec else dict(lib.EMPTY_FIELDS)
    state = {"step": 1, "fields": fields, "errors": {}}
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

    @router.get("/step", response_class=HTMLResponse)
    async def step(request: Request):
        params = dict(request.query_params)
        state = _parse_state(params)
        state["errors"] = {}
        return _render_content(state, base_path)

    @router.post("/next", response_class=HTMLResponse)
    async def go_next(request: Request):
        form = await request.form()
        params = {**dict(request.query_params), **dict(form)}
        state = _parse_state(params)
        errors = lib.validate_step(state["step"], state["fields"])
        if errors:
            state["errors"] = errors
            return _render_content(state, base_path)
        state["step"] = lib.next_step(state["step"])
        state["errors"] = {}
        return _render_content(state, base_path)

    @router.post("/prev", response_class=HTMLResponse)
    async def go_prev(request: Request):
        form = await request.form()
        params = {**dict(request.query_params), **dict(form)}
        state = _parse_state(params)
        state["step"] = lib.prev_step(state["step"])
        state["errors"] = {}
        return _render_content(state, base_path)

    @router.post("/submit", response_class=HTMLResponse)
    async def submit(request: Request):
        return '<div id="form-content"><div class="form-step" data-step="done"><h2>Submitted</h2><p>Your form has been submitted.</p></div></div>'

    return router
