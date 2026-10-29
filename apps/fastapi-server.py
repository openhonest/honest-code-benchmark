"""FastAPI server for arm 11 (Honest Code pipeline). Runs beside the Node server on a different port."""

import importlib.util
import json
import sys
import time
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

APP_DIR = Path(__file__).parent
DATA_DIR = APP_DIR.parent / "data"
SHARED_DIR = APP_DIR.parent / "shared"
VENDOR_DIR = APP_DIR.parent / "vendor"
GENX_CDN = VENDOR_DIR / "genx"
DOMX_DIST = VENDOR_DIR / "domx"

ARM = "11-fastapi-honest-htmx"
ARCHETYPES = ("table", "form", "dashboard", "browser", "grid")

app = FastAPI()

app.mount("/shared", StaticFiles(directory=str(SHARED_DIR)), name="shared")
app.mount("/genx", StaticFiles(directory=str(GENX_CDN)), name="genx")
app.mount("/domx", StaticFiles(directory=str(DOMX_DIST)), name="domx")


def _load_module(archetype: str):
    routes_path = APP_DIR / archetype / ARM / "routes.py"
    if not routes_path.exists():
        return None
    lib_path = APP_DIR / archetype / ARM / "lib.py"
    lib_name = f"arm11_lib_{archetype}"
    lib_spec = importlib.util.spec_from_file_location(lib_name, str(lib_path))
    lib_mod = importlib.util.module_from_spec(lib_spec)
    sys.modules[lib_name] = lib_mod
    lib_spec.loader.exec_module(lib_mod)

    routes_name = f"arm11_routes_{archetype}"
    spec = importlib.util.spec_from_file_location(routes_name, str(routes_path))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _load_data(archetype: str, rows: int) -> list[dict]:
    path = DATA_DIR / archetype / f"{rows}.json"
    with open(path) as f:
        return json.load(f)


_modules: dict = {}

for _arch in ARCHETYPES:
    _mod = _load_module(_arch)
    if _mod is None:
        continue
    _modules[_arch] = _mod
    router = _mod.create_router(_arch)
    app.include_router(router, prefix=f"/{_arch}/{ARM}")


@app.get("/{archetype}/{arm}/", response_class=HTMLResponse)
async def serve_page(request: Request, archetype: str, arm: str):
    if arm != ARM:
        return HTMLResponse(f"Unknown arm: {arm}", status_code=404)
    rows = int(request.query_params.get("rows", "1000"))

    mod = _modules.get(archetype)
    if mod is None:
        return HTMLResponse(f"Not found: {archetype}/{ARM}", status_code=404)

    data = _load_data(archetype, rows)
    start = time.perf_counter()
    html = mod.render_page(data, archetype, ARM, rows)
    render_ms = (time.perf_counter() - start) * 1000
    return HTMLResponse(html, headers={"Server-Timing": f"render;dur={render_ms:.2f}"})


if __name__ == "__main__":
    import uvicorn
    port = 4001
    for i, arg in enumerate(sys.argv):
        if arg == "--port" and i + 1 < len(sys.argv):
            port = int(sys.argv[i + 1])
    print(f"FastAPI benchmark server: http://localhost:{port}")
    print(f"Example: http://localhost:{port}/table/{ARM}/?rows=1000")
    uvicorn.run(app, host="0.0.0.0", port=port)
