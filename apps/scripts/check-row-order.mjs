#!/usr/bin/env node
// Row-order parity (correctness only, no timing).
//
// For every sortable column, both directions, and one filter per archetype,
// the ids on page 1 must be the same in:
//   - the reference: the checked-in JSON sorted by the spec's sort rule
//     (strings by toLowerCase, numbers ascending, booleans true first,
//     ties by ascending id; filters by case-insensitive substring),
//   - Arm 6 (SQLite, JSON API),
//   - Arm 10 (SQLite, EJS partials),
//   - Arm 11 (SQLite, Jinja partials, through the same-origin proxy).
// The client-side arms (1-5, 7-9) run the reference rule in the browser.
//
// The dashboard adds refresh cases: a category filter plus a sort on page 2,
// re-read the way an auto-refresh does it (Arm 6 refetches /api/page with
// its state; Arms 10 and 11 call /refresh with the hidden-input state). The
// ids must still match the reference page 2.
//
// Usage: node scripts/check-row-order.mjs [--base http://127.0.0.1:4000] [--sizes 100,1000]
// Needs the Node server and the FastAPI server running. Exits 1 on mismatch.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');
const PER_PAGE = 25;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}
const base = arg('base', 'http://127.0.0.1:4000');
const sizes = arg('sizes', '100,1000,10000,50000,100000').split(',');

const SPECS = {
  table: {
    cols: ['name', 'email', 'department', 'hireDate', 'salary', 'active'],
    filter: { text: 'smith', match: (r, t) => [r.name, r.email, r.department].some((v) => v.toLowerCase().includes(t)) },
    arm6: (s) => ({ q: s.text ?? '', col: s.col ?? '', dir: s.dir ?? '' }),
    htmxFilter: (s) => ['filter', { filterInput: s.text }],
  },
  dashboard: {
    cols: ['id', 'date', 'customerName', 'category', 'amount', 'status', 'items'],
    filter: { category: true, match: (r, c) => r.category === c },
    arm6: (s) => ({ category: s.text ?? 'All', col: s.col ?? '', dir: s.dir ?? '', ...(s.page ? { page: String(s.page) } : {}) }),
    htmxFilter: (s) => ['filter', { categoryInput: s.text, category: s.text }],
    htmxRefresh: (s) => ({ sortCol: s.col, sortDir: s.dir, category: s.text, status: 'All', dateFrom: '', dateTo: '', page: String(s.page) }),
  },
  browser: {
    cols: ['name', 'status', 'createdDate', 'value'],
    filter: { text: 'an', match: (r, t) => r.name.toLowerCase().includes(t) },
    arm6: (s) => ({ q: s.text ?? '', col: s.col ?? '', dir: s.dir ?? '' }),
    htmxFilter: (s) => ['search', { searchInput: s.text }],
  },
};

function compare(col, dir) {
  const sign = dir === 'desc' ? -1 : 1;
  return (a, b) => {
    const av = a[col], bv = b[col];
    let cmp;
    if (typeof av === 'string') {
      const al = av.toLowerCase(), bl = bv.toLowerCase();
      cmp = al < bl ? -1 : al > bl ? 1 : 0;
    } else if (typeof av === 'boolean') {
      cmp = av === bv ? 0 : av ? -1 : 1;
    } else {
      cmp = av - bv;
    }
    return cmp !== 0 ? sign * cmp : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  };
}

function reference(rows, spec, s) {
  let out = rows;
  if (s.text !== undefined) out = out.filter((r) => spec.filter.match(r, s.text));
  if (s.col) out = [...out].sort(compare(s.col, s.dir));
  // The servers clamp a page past the end to the last page.
  const page = Math.min(s.page ?? 1, Math.max(1, Math.ceil(out.length / PER_PAGE)));
  const start = (page - 1) * PER_PAGE;
  return out.slice(start, start + PER_PAGE).map((r) => r.id);
}

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}
const idsFromHtml = (html) => [...html.matchAll(/<tr[^>]*data-row="([^"]+)"/g)].map((m) => (/^\d+$/.test(m[1]) ? Number(m[1]) : m[1]));

async function arm6Ids(arch, s) {
  const qs = new URLSearchParams(SPECS[arch].arm6(s));
  const body = await (await get(`${base}/${arch}/6-react-ssr-stateless-domx/api/page?${qs}`)).json();
  return body.rows.map((r) => r.id);
}

// Drives the htmx partials the way the page does: state rides in the
// hidden inputs, a sort click toggles asc -> desc.
async function htmxIds(arch, arm, s) {
  const root = `${base}/${arch}/${arm}`;
  const state = { sortCol: '', sortDir: '', page: '1' };
  let html;
  if (s.refresh) {
    html = await (await get(`${root}/refresh?${new URLSearchParams(SPECS[arch].htmxRefresh(s))}`)).text();
  } else if (s.text !== undefined) {
    const [path, params] = SPECS[arch].htmxFilter(s);
    html = await (await get(`${root}/${path}?${new URLSearchParams({ ...state, ...params })}`)).text();
  } else {
    html = await (await get(`${root}/sort?${new URLSearchParams({ ...state, col: s.col })}`)).text();
    if (s.dir === 'desc') {
      html = await (await get(`${root}/sort?${new URLSearchParams({ ...state, sortCol: s.col, sortDir: 'asc', col: s.col })}`)).text();
    }
  }
  return idsFromHtml(html);
}

let pass = 0, fail = 0;
for (const size of sizes) {
  for (const [arch, spec] of Object.entries(SPECS)) {
    const rows = JSON.parse(readFileSync(join(DATA, arch, `${size}.json`), 'utf-8'));
    const cases = [];
    for (const col of spec.cols) for (const dir of ['asc', 'desc']) cases.push({ col, dir });
    cases.push({ text: spec.filter.category ? rows[0].category : spec.filter.text });
    if (spec.htmxRefresh) {
      for (const dir of ['asc', 'desc']) cases.push({ refresh: true, text: rows[0].category, col: 'amount', dir, page: 2 });
    }
    // A page load opens each arm's database for this size.
    for (const arm of ['6-react-ssr-stateless-domx', '10-htmx-ejs', '11-fastapi-honest-htmx']) {
      await get(`${base}/${arch}/${arm}/?rows=${size}`);
    }
    for (const s of cases) {
      const want = reference(rows, spec, s);
      const got = {
        6: await arm6Ids(arch, s),
        10: await htmxIds(arch, '10-htmx-ejs', s),
        11: await htmxIds(arch, '11-fastapi-honest-htmx', s),
      };
      const label = `${arch} ${size} ${s.refresh ? `refresh "${s.text}" ${s.col} ${s.dir} page ${s.page}` : s.col ? `${s.col} ${s.dir}` : `filter "${s.text}"`}`;
      for (const [arm, ids] of Object.entries(got)) {
        if (ids.length === want.length && ids.every((id, i) => id === want[i])) pass++;
        else { fail++; console.log(`FAIL arm ${arm} ${label}\n  want ${want.join(',')}\n  got  ${ids.join(',')}`); }
      }
    }
  }
}
console.log(`row order: ${pass} of ${pass + fail} checks match the reference`);
process.exit(fail ? 1 : 0);
