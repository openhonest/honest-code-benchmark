"""Pure functions for the form archetype. No I/O, no side effects, no classes."""

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
