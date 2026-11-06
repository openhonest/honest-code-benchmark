// Request validation and safe serialization helpers for the Node server.

import { parsePositiveInt } from './value-rules.js';

export class BadRequest extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

// A query value that must be a plain string. Missing values take the fallback;
// repeated keys (arrays) and objects are rejected.
export function queryString(query, key, fallback = '') {
  const v = query[key];
  if (v === undefined) return fallback;
  if (typeof v !== 'string') throw new BadRequest(`${key} must be a single string`);
  return v;
}

export function queryPage(query, key = 'page') {
  const v = queryString(query, key, '1');
  const n = parsePositiveInt(v);
  if (n === null) throw new BadRequest(`${key} must be a positive integer`);
  return n;
}

export function queryDir(query, key = 'dir') {
  const v = queryString(query, key, '');
  if (v !== '' && v !== 'asc' && v !== 'desc') throw new BadRequest(`${key} must be asc or desc`);
  return v;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function queryDate(query, key) {
  const v = queryString(query, key, '');
  if (v !== '' && !DATE_RE.test(v)) throw new BadRequest(`${key} must be YYYY-MM-DD`);
  return v;
}

export function bodyIdList(body, key = 'ids') {
  const v = body?.[key];
  if (!Array.isArray(v) || v.length > 100000 || !v.every((id) => Number.isInteger(id) && id > 0)) {
    throw new BadRequest(`${key} must be an array of positive integers`);
  }
  return v;
}

export function bodyId(body, key = 'id') {
  const v = body?.[key];
  if (!Number.isInteger(v) || v <= 0) throw new BadRequest(`${key} must be a positive integer`);
  return v;
}

export function bodyString(body, key) {
  const v = body?.[key];
  if (typeof v !== 'string') throw new BadRequest(`${key} must be a string`);
  return v;
}

// JSON that is safe inside an inline <script>: no "</script>", no HTML
// comment openers, and no line separators that break older parsers.
export function scriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

// Wraps an async route so a thrown error reaches the Express error handler.
export const route = (fn) => (req, res, next) => {
  Promise.resolve().then(() => fn(req, res, next)).catch(next);
};

// Form and query values posted by htmx. An absent or empty value takes the
// fallback; anything else must be a positive integer ("Infinity", "1e9",
// "-1", and "2.5" are rejected with 400).
export function intParam(raw, name, fallback = 1) {
  if (raw === undefined || raw === '') return fallback;
  const n = parsePositiveInt(raw);
  if (n === null) throw new BadRequest(`${name} must be a positive integer`);
  return n;
}

export function strParam(raw, name, fallback = '') {
  if (raw === undefined) return fallback;
  if (typeof raw !== 'string') throw new BadRequest(`${name} must be a single string`);
  return raw;
}

// A JSON object of { id: true } posted as a string.
export function selectionParam(raw) {
  if (raw === undefined || raw === '') return {};
  if (typeof raw !== 'string') throw new BadRequest('selected must be a JSON string');
  let v;
  try { v = JSON.parse(raw); } catch { throw new BadRequest('selected must be JSON'); }
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new BadRequest('selected must be an object');
  const out = {};
  for (const [k, on] of Object.entries(v)) {
    if (parsePositiveInt(k) === null) throw new BadRequest('selected keys must be ids');
    if (on) out[k] = true;
  }
  return out;
}

// Sends an HTML partial with a Server-Timing header built by the given timer.
export function sendTimed(res, timer, html) {
  res.setHeader('Server-Timing', timer.header());
  res.send(html);
}

export function requireId(raw, name = 'id') {
  const n = intParam(raw, name, null);
  if (n === null) throw new BadRequest(`${name} is required`);
  return n;
}
