"""Request validation for Arm 11. Mirror of the helpers in lib/http-util.js.

Bad input raises BadRequest; fastapi-server.py turns it into a 400 response.
"""

import json

from .value_rules import parse_positive_int


class BadRequest(Exception):
    status_code = 400


def int_param(raw, name, fallback=1):
    """An absent or empty value takes the fallback; anything else must be a
    positive integer ("Infinity", "1e9", "-1" and "2.5" are rejected)."""
    if raw is None or raw == "":
        return fallback
    n = parse_positive_int(raw)
    if n is None:
        raise BadRequest(f"{name} must be a positive integer")
    return n


def require_id(raw, name="id"):
    n = int_param(raw, name, None)
    if n is None:
        raise BadRequest(f"{name} is required")
    return n


def selection_param(raw) -> dict[int, bool]:
    """A JSON object of {id: true} posted as a string. Keys become int."""
    if raw is None or raw == "":
        return {}
    try:
        value = json.loads(raw)
    except (TypeError, ValueError):
        raise BadRequest("selected must be JSON") from None
    if not isinstance(value, dict):
        raise BadRequest("selected must be an object")
    out = {}
    for key, on in value.items():
        n = parse_positive_int(key)
        if n is None:
            raise BadRequest("selected keys must be ids")
        if on:
            out[n] = True
    return out


def selection_json(selected: dict[int, bool]) -> str:
    """Serializes a selection with ids in ascending order."""
    return json.dumps({str(k): True for k in sorted(selected)}, separators=(",", ":"))
