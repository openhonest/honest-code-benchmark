"""FastAPI server for Arms 11 and 12 (Honest Code pipeline).

Runs beside the Node server on its own port. The Node server proxies
/{archetype}/11-fastapi-honest-htmx/* and /{archetype}/12-fastapi-honest-nogenx/*
to this process, so the browser sees one origin for every arm. Response policy
matches the Node server: COOP/COEP on every response, gzip level 6 above
500 bytes, 400 for bad input, and a Server-Timing header that lists only the
phases these arms measure (load and render).
"""

import importlib.util
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

APP_DIR = Path(__file__).parent
sys.path.insert(0, str(APP_DIR))
from lib.http_util import BadRequest  # noqa: E402
from lib.timing import Timer  # noqa: E402
from lib.value_rules import parse_positive_int  # noqa: E402

DATA_DIR = APP_DIR.parent / "data"
SHARED_DIR = APP_DIR.parent / "shared"
VENDOR_DIR = APP_DIR.parent / "vendor"

ARM = "11-fastapi-honest-htmx"
ARM12 = "12-fastapi-honest-nogenx"
FASTAPI_ARMS = (ARM, ARM12)
ARCHETYPES = ("table", "form", "dashboard", "browser", "grid")
ALLOWED_SIZES = frozenset({100, 1000, 10000, 50000, 100000})

_modules: dict = {}


@asynccontextmanager
async def lifespan(app):
    yield
    for mod in _modules.values():
        close = getattr(mod, "close", None)
        if close:
            close()


app = FastAPI(lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=500, compresslevel=6)


@app.middleware("http")
async def isolation_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
    return response


@app.exception_handler(BadRequest)
async def bad_request(request: Request, exc: BadRequest):
    return PlainTextResponse(f"Bad request: {exc}", status_code=400)


app.mount("/shared", StaticFiles(directory=str(SHARED_DIR)), name="shared")
app.mount("/htmx", StaticFiles(directory=str(VENDOR_DIR / "htmx")), name="htmx")
app.mount("/genx", StaticFiles(directory=str(VENDOR_DIR / "genx")), name="genx")
app.mount("/domx", StaticFiles(directory=str(VENDOR_DIR / "domx")), name="domx")


@app.get("/lib/htmx-replay.js")
async def htmx_replay():
    """Reload persistence for Arms 10 and 11; server.js serves the same file."""
    return FileResponse(APP_DIR / "lib" / "htmx-replay.js", media_type="text/javascript")


def _load_module(archetype: str, arm: str):
    routes_path = APP_DIR / archetype / arm / "routes.py"
    if not routes_path.exists():
        return None
    spec = importlib.util.spec_from_file_location(f"{arm}_routes_{archetype}", str(routes_path))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


for _arm in FASTAPI_ARMS:
    for _arch in ARCHETYPES:
        _mod = _load_module(_arch, _arm)
        if _mod is None:
            continue
        _key = f"{_arch}/{_arm}"
        _modules[_key] = _mod
        app.include_router(_mod.create_router(_arch), prefix=f"/{_arch}/{_arm}")


DEFAULT_REFRESH_SECONDS = 60
MAX_REFRESH_SECONDS = 3600


def parse_refresh(raw):
    """Dashboard auto-refresh interval: ?refresh=N seconds, default 60, 0 = timer
    off. Same rule as parseRefresh() in server.js."""
    if raw is None:
        return DEFAULT_REFRESH_SECONDS
    if not (raw.isascii() and raw.isdigit() and len(raw) <= 4) or int(raw) > MAX_REFRESH_SECONDS:
        raise BadRequest(f"refresh must be an integer from 0 to {MAX_REFRESH_SECONDS}")
    return int(raw)


@app.get("/{archetype}/{arm}/", response_class=HTMLResponse)
async def serve_page(request: Request, archetype: str, arm: str):
    key = f"{archetype}/{arm}"
    mod = _modules.get(key)
    if arm not in FASTAPI_ARMS or mod is None:
        return PlainTextResponse(f"Not found: {archetype}/{arm}", status_code=404)
    raw = request.query_params.get("rows", "1000")
    rows = parse_positive_int(raw)
    if rows not in ALLOWED_SIZES:
        raise BadRequest(f"rows must be one of {sorted(ALLOWED_SIZES)}")

    sqlite_path = str(DATA_DIR / "sqlite" / f"{rows}.sqlite")
    timer = Timer()
    if archetype == "dashboard":
        refresh = parse_refresh(request.query_params.get("refresh"))
        html = mod.render_page(sqlite_path, archetype, arm, rows, timer, refresh_seconds=refresh)
    else:
        html = mod.render_page(sqlite_path, archetype, arm, rows, timer)
    return HTMLResponse(html, headers={"Server-Timing": timer.header()})


if __name__ == "__main__":
    import uvicorn

    port = 4001
    for i, arg in enumerate(sys.argv):
        if arg == "--port" and i + 1 < len(sys.argv):
            port = int(sys.argv[i + 1])
    print(f"FastAPI benchmark server: http://127.0.0.1:{port}")
    print(f"Example: http://127.0.0.1:{port}/table/{ARM}/?rows=1000")
    uvicorn.run(app, host="127.0.0.1", port=port)
