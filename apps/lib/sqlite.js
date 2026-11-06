// SQLite data access for Arms 6, 10 and 11 (Python mirror: lib/sqlite_db.py),
// and the full-dataset loader for Arms 7-9.
//
// Sort rule (all arms): strings compare as ASCII lower case (SQLite NOCASE),
// numbers numerically, booleans true first on ascending; ties break on
// ascending id in both directions. Text filters use instr(), not LIKE.
// Money is stored as integer cents and divided by 100 only when a row is mapped.

import Database from 'better-sqlite3';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseSalary, parseMoneyCents } from './value-rules.js';

export const ROWS_PER_PAGE = 25;
const READ_PRAGMAS = ['cache_size = -65536', 'temp_store = MEMORY', 'mmap_size = 268435456', 'query_only = ON'];
const WRITE_PRAGMAS = ['cache_size = -65536', 'temp_store = MEMORY', 'journal_mode = WAL', 'synchronous = OFF'];

function open(path, { readonly }) {
  const db = new Database(path, { readonly, fileMustExist: true });
  for (const p of readonly ? READ_PRAGMAS : WRITE_PRAGMAS) db.pragma(p);
  return db;
}

// Lookups go through a Map, so keys such as "__proto__" or "constructor" never
// reach SQL and never resolve to inherited properties.
function buildOrders(sorts, booleanCol) {
  const orders = new Map();
  for (const [col, expr] of Object.entries(sorts)) {
    orders.set(`${col}:asc`, `${expr} ASC`);
    orders.set(`${col}:desc`, `${expr} DESC`);
  }
  if (booleanCol) {
    orders.set(`${booleanCol}:asc`, `${booleanCol} DESC`);
    orders.set(`${booleanCol}:desc`, `${booleanCol} ASC`);
  }
  orders.set(':', 'id ASC');
  return orders;
}

function prepareOrdered(db, table, filter, orders) {
  const countStmt = db.prepare(`SELECT count(*) AS n FROM ${table} WHERE ${filter}`);
  const pageStmts = new Map();
  for (const [key, order] of orders) {
    pageStmts.set(key, db.prepare(
      `SELECT * FROM ${table} WHERE ${filter} ORDER BY ${order}, id ASC LIMIT ${ROWS_PER_PAGE} OFFSET :offset`
    ));
  }
  return { countStmt, pageStmts };
}

function clampPage(page, total) {
  const totalPages = Math.max(1, Math.ceil(total / ROWS_PER_PAGE));
  const n = Number.isInteger(page) ? page : 1;
  return { page: Math.min(Math.max(1, n), totalPages), totalPages };
}

function runPage(stmts, params, col, dir, page, mapRow) {
  const total = stmts.countStmt.get(params).n;
  const p = clampPage(page, total);
  const stmt = stmts.pageStmts.get(col ? `${col}:${dir}` : ':') || stmts.pageStmts.get(':');
  const rows = stmt.all({ ...params, offset: (p.page - 1) * ROWS_PER_PAGE }).map(mapRow);
  return { rows, page: p.page, totalPages: p.totalPages, total };
}

const str = (v, fallback) => (typeof v === 'string' ? v : fallback);

// ---------------------------------------------------------------- mappers
const mapEmployee = (r) => ({ ...r, active: r.active === 1 });
const mapOrder = (r) => ({ ...r, amount: r.amount / 100 });
const mapBrowserRecord = (r) => ({ ...r, value: r.value / 100 });
const mapBudgetLine = (r) => ({
  ...r, q1: r.q1 / 100, q2: r.q2 / 100, q3: r.q3 / 100, q4: r.q4 / 100, budgetTarget: r.budgetTarget / 100,
});
const identity = (r) => r;

// ---------------------------------------------------------------- table
const TABLE_SORTS = {
  name: 'name COLLATE NOCASE',
  email: 'email COLLATE NOCASE',
  department: 'department COLLATE NOCASE',
  hireDate: 'hireDate',
  salary: 'salary',
};
const TABLE_ORDERS = buildOrders(TABLE_SORTS, 'active');
const TABLE_FILTER = `(:q = '' OR instr(lower(name), lower(:q)) > 0
  OR instr(lower(email), lower(:q)) > 0 OR instr(lower(department), lower(:q)) > 0)`;
export const TABLE_EDITABLE = new Set(['name', 'salary']);

function tableQueries(db) {
  const stmts = prepareOrdered(db, 'employees', TABLE_FILTER, TABLE_ORDERS);
  const byId = db.prepare('SELECT * FROM employees WHERE id = ?');
  const allStmt = db.prepare('SELECT * FROM employees ORDER BY id');
  return {
    page: ({ q = '', col = '', dir = '', page = 1 } = {}) => runPage(stmts, { q: str(q, '') }, col, dir, page, mapEmployee),
    getById: (id) => { const r = byId.get(id); return r ? mapEmployee(r) : null; },
    all: () => allStmt.all().map(mapEmployee),
  };
}

// ---------------------------------------------------------------- dashboard
const DASH_SORTS = {
  id: 'id',
  date: 'date',
  customerName: 'customerName COLLATE NOCASE',
  category: 'category COLLATE NOCASE',
  amount: 'amount',
  status: 'status COLLATE NOCASE',
  items: 'items',
};
const DASH_ORDERS = buildOrders(DASH_SORTS, null);
const DASH_FILTER = `(:category = 'All' OR category = :category)
  AND (:status = 'All' OR status = :status)
  AND (:dateFrom = '' OR date >= :dateFrom)
  AND (:dateTo = '' OR date <= :dateTo)`;

function dashboardQueries(db) {
  const stmts = prepareOrdered(db, 'orders', DASH_FILTER, DASH_ORDERS);
  const aggStmt = db.prepare(`SELECT count(*) AS totalOrders, coalesce(sum(amount), 0) AS totalRevenueCents,
    count(DISTINCT customerName) AS uniqueCustomers FROM orders WHERE ${DASH_FILTER}`);
  const categoriesStmt = db.prepare('SELECT DISTINCT category FROM orders ORDER BY category COLLATE NOCASE, category');
  const statusesStmt = db.prepare('SELECT DISTINCT status FROM orders ORDER BY status COLLATE NOCASE, status');
  const allStmt = db.prepare('SELECT * FROM orders ORDER BY id');
  return {
    page: ({ category = 'All', status = 'All', dateFrom = '', dateTo = '', col = '', dir = '', page = 1 } = {}) => {
      const params = { category: str(category, 'All'), status: str(status, 'All'), dateFrom: str(dateFrom, ''), dateTo: str(dateTo, '') };
      const result = runPage(stmts, params, col, dir, page, mapOrder);
      const agg = aggStmt.get(params);
      return {
        ...result,
        totalRevenueCents: agg.totalRevenueCents,
        totalRevenue: agg.totalRevenueCents / 100,
        avgOrder: agg.totalOrders > 0 ? agg.totalRevenueCents / 100 / agg.totalOrders : 0,
        uniqueCustomers: agg.uniqueCustomers,
      };
    },
    categories: () => categoriesStmt.all().map((r) => r.category),
    statuses: () => statusesStmt.all().map((r) => r.status),
    all: () => allStmt.all().map(mapOrder),
  };
}

// ---------------------------------------------------------------- browser
const BROWSER_SORTS = {
  name: 'name COLLATE NOCASE',
  status: 'status COLLATE NOCASE',
  createdDate: 'createdDate',
  value: 'value',
};
const BROWSER_ORDERS = buildOrders(BROWSER_SORTS, null);
const BROWSER_FILTER = `(:q = '' OR instr(lower(name), lower(:q)) > 0)
  AND (:status = 'all' OR status = :status)`;

function browserQueries(db) {
  const stmts = prepareOrdered(db, 'browser_records', BROWSER_FILTER, BROWSER_ORDERS);
  const byId = db.prepare('SELECT * FROM browser_records WHERE id = ?');
  const allStmt = db.prepare('SELECT * FROM browser_records ORDER BY id');
  return {
    page: ({ q = '', status = 'all', col = '', dir = '', page = 1 } = {}) =>
      runPage(stmts, { q: str(q, ''), status: str(status, 'all') }, col, dir, page, mapBrowserRecord),
    getById: (id) => { const r = byId.get(id); return r ? mapBrowserRecord(r) : null; },
    all: () => allStmt.all().map(mapBrowserRecord),
  };
}

// ---------------------------------------------------------------- form
function formQueries(db) {
  const firstStmt = db.prepare('SELECT * FROM customers ORDER BY id LIMIT 1');
  const allStmt = db.prepare('SELECT * FROM customers ORDER BY id');
  return {
    getFirst: () => firstStmt.get() || null,
    all: () => allStmt.all().map(identity),
  };
}

// ---------------------------------------------------------------- grid
const GRID_FILTER = `(:category = 'All' OR category = :category)`;
export const GRID_QUARTERS = new Set(['q1', 'q2', 'q3', 'q4']);

function gridTotals(r) {
  const totalCents = r.q1 + r.q2 + r.q3 + r.q4;
  return {
    cents: { q1: r.q1, q2: r.q2, q3: r.q3, q4: r.q4, budgetTarget: r.budgetTarget, total: totalCents, variance: totalCents - r.budgetTarget },
    q1: r.q1 / 100, q2: r.q2 / 100, q3: r.q3 / 100, q4: r.q4 / 100, budgetTarget: r.budgetTarget / 100,
    total: totalCents / 100, variance: (totalCents - r.budgetTarget) / 100,
  };
}

function gridQueries(db) {
  const categoriesStmt = db.prepare('SELECT DISTINCT category FROM budget_lines ORDER BY category COLLATE NOCASE, category');
  const countStmt = db.prepare(`SELECT count(*) AS n FROM budget_lines WHERE ${GRID_FILTER}`);
  const pageStmt = db.prepare(`SELECT * FROM budget_lines WHERE ${GRID_FILTER} ORDER BY id ASC LIMIT ${ROWS_PER_PAGE} OFFSET :offset`);
  const totalsStmt = db.prepare(`SELECT coalesce(sum(q1),0) AS q1, coalesce(sum(q2),0) AS q2, coalesce(sum(q3),0) AS q3,
    coalesce(sum(q4),0) AS q4, coalesce(sum(budgetTarget),0) AS budgetTarget FROM budget_lines WHERE ${GRID_FILTER}`);
  const byId = db.prepare('SELECT * FROM budget_lines WHERE id = ?');
  const allStmt = db.prepare('SELECT * FROM budget_lines ORDER BY id');
  return {
    page: ({ category = 'All', page = 1 } = {}) => {
      const c = str(category, 'All');
      const total = countStmt.get({ category: c }).n;
      const p = clampPage(page, total);
      const rows = pageStmt.all({ category: c, offset: (p.page - 1) * ROWS_PER_PAGE }).map(mapBudgetLine);
      return { rows, page: p.page, totalPages: p.totalPages, total };
    },
    totals: ({ category = 'All' } = {}) => gridTotals(totalsStmt.get({ category: str(category, 'All') })),
    getById: (id) => { const r = byId.get(id); return r ? mapBudgetLine(r) : null; },
    categories: () => categoriesStmt.all().map((r) => r.category),
    all: () => allStmt.all().map(mapBudgetLine),
  };
}

// ---------------------------------------------------------------- read-only openers
function readOnly(queries) {
  return (dbPath) => {
    const db = open(dbPath, { readonly: true });
    return { ...queries(db), close: () => db.close() };
  };
}

export const openTableDb = readOnly(tableQueries);
export const openDashboardDb = readOnly(dashboardQueries);
export const openBrowserDb = readOnly(browserQueries);
export const openFormDb = readOnly(formQueries);
export const openGridDb = readOnly(gridQueries);

// ---------------------------------------------------------------- per-run working copies
// A working copy lives in its own temp directory. dispose() closes it and
// removes the directory; reset() restores the pristine file and re-prepares
// every statement on the new connection.

function workingCopy(pristinePath, fileName, build) {
  const dir = mkdtempSync(join(tmpdir(), 'bench-'));
  const path = join(dir, fileName);
  let db;
  let api;
  const connect = () => {
    copyFileSync(pristinePath, path);
    db = open(path, { readonly: false });
    api = build(db);
  };
  connect();
  const handle = new Proxy({}, {
    get(_, key) {
      if (key === 'reset') return () => { db.close(); connect(); };
      if (key === 'close') return () => db.close();
      if (key === 'dispose') return () => { try { db.close(); } catch {} rmSync(dir, { recursive: true, force: true }); };
      if (key === 'dir') return dir;
      return api[key];
    },
  });
  return handle;
}

function mutableTable(db) {
  const reads = tableQueries(db);
  const updateName = db.prepare('UPDATE employees SET name = ? WHERE id = ?');
  const updateSalary = db.prepare('UPDATE employees SET salary = ? WHERE id = ?');
  const deleteStmt = db.prepare('DELETE FROM employees WHERE id IN (SELECT value FROM json_each(?))');
  return {
    ...reads,
    // Returns true only when a known column on an existing row was written.
    update: (id, col, rawValue) => {
      if (!TABLE_EDITABLE.has(col) || typeof rawValue !== 'string') return false;
      if (col === 'salary') {
        const salary = parseSalary(rawValue);
        if (salary === null) return false;
        return updateSalary.run(salary, id).changes === 1;
      }
      return updateName.run(rawValue, id).changes === 1;
    },
    delete: (ids) => deleteStmt.run(JSON.stringify(ids.filter(Number.isInteger))).changes,
  };
}

function mutableGrid(db) {
  const reads = gridQueries(db);
  const updates = new Map();
  const bulk = new Map();
  for (const q of GRID_QUARTERS) {
    updates.set(q, db.prepare(`UPDATE budget_lines SET ${q} = ? WHERE id = ?`));
    bulk.set(q, db.prepare(`UPDATE budget_lines SET ${q} = ? WHERE id IN (SELECT value FROM json_each(?))`));
  }
  return {
    ...reads,
    updateCell: (id, field, rawValue) => {
      const stmt = updates.get(field);
      const cents = parseMoneyCents(rawValue);
      if (!stmt || cents === null) return false;
      return stmt.run(cents, id).changes === 1;
    },
    bulkFill: (ids, field, rawValue) => {
      const stmt = bulk.get(field);
      const cents = parseMoneyCents(rawValue);
      if (!stmt || cents === null) return false;
      stmt.run(cents, JSON.stringify(ids.filter(Number.isInteger)));
      return true;
    },
  };
}

export const openMutableTableDb = (pristinePath) => workingCopy(pristinePath, 'employees.sqlite', mutableTable);
export const openMutableGridDb = (pristinePath) => workingCopy(pristinePath, 'budget_lines.sqlite', mutableGrid);
