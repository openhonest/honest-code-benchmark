// Server side of Arm 6 (React SSR + stateless DOM state).
//
// Arm 6 reads one page at a time from SQLite with LIMIT/OFFSET, the same data
// access as Arms 10 and 11. The page load renders page 1; after hydration the
// client calls the JSON endpoints below for every later page, sort, filter,
// and edit. Table and grid edits go to a per-page-load working copy, so every
// page load starts from the pristine database.

import { Router } from 'express';
import { createTimer } from './timing.js';
import { join } from 'node:path';
import {
  openTableDb, openDashboardDb, openBrowserDb, openGridDb,
  openMutableTableDb, openMutableGridDb,
} from './sqlite.js';
import {
  BadRequest, queryString, queryPage, queryDir, queryDate,
  bodyId, bodyIdList, bodyString, route,
} from './http-util.js';

export const ARM6 = '6-react-ssr-stateless-domx';

const MUTABLE = { table: openMutableTableDb, grid: openMutableGridDb };
const READ_ONLY = { dashboard: openDashboardDb, browser: openBrowserDb };

// Query parsers: each turns a request query into the arguments of db.page().
const PAGE_QUERIES = {
  table: (q) => ({ q: queryString(q, 'q'), col: queryString(q, 'col'), dir: queryDir(q), page: queryPage(q) }),
  dashboard: (q) => ({
    category: queryString(q, 'category', 'All'), status: queryString(q, 'status', 'All'),
    dateFrom: queryDate(q, 'dateFrom'), dateTo: queryDate(q, 'dateTo'),
    col: queryString(q, 'col'), dir: queryDir(q), page: queryPage(q),
  }),
  browser: (q) => ({
    q: queryString(q, 'q'), status: queryString(q, 'status', 'all'),
    col: queryString(q, 'col'), dir: queryDir(q), page: queryPage(q),
  }),
  grid: (q) => ({ category: queryString(q, 'category', 'All'), page: queryPage(q) }),
};

// What one page response holds for each archetype.
const PAGE_BUILDERS = {
  table: (db, args) => db.page(args),
  // loadedAt stamps when the rows were read, for the dashboard's
  // last-updated line; every refresh re-reads and re-stamps.
  dashboard: (db, args) => ({ ...db.page(args), categories: db.categories(), statuses: db.statuses(), loadedAt: new Date().toISOString() }),
  browser: (db, args) => db.page(args),
  grid: (db, args) => ({ ...db.page(args), totals: db.totals(args), categories: db.categories() }),
};

export const ARM6_ARCHETYPES = Object.keys(PAGE_BUILDERS);

export function createArm6(dataDir) {
  const sqlitePath = (rows) => join(dataDir, 'sqlite', `${rows}.sqlite`);
  const readOnly = new Map();       // `${archetype}/${rows}` -> read-only handle
  const current = new Map();        // archetype -> handle used by the JSON API

  // Opens the database for a page load. Not timed: this is setup, like a
  // server opening its pool. A new working copy replaces the old one.
  function open(archetype, rows) {
    if (MUTABLE[archetype]) {
      current.get(archetype)?.dispose();
      const db = MUTABLE[archetype](sqlitePath(rows));
      current.set(archetype, db);
      return db;
    }
    const key = `${archetype}/${rows}`;
    if (!readOnly.has(key)) readOnly.set(key, READ_ONLY[archetype](sqlitePath(rows)));
    const db = readOnly.get(key);
    current.set(archetype, db);
    return db;
  }

  function firstPage(archetype, db) {
    return PAGE_BUILDERS[archetype](db, PAGE_QUERIES[archetype]({}));
  }

  function dbFor(archetype) {
    const db = current.get(archetype);
    if (!db) throw new BadRequest('load the page before calling the API');
    return db;
  }

  const router = Router({ mergeParams: true });
  router.use((req, res, next) => {
    if (!PAGE_BUILDERS[req.params.archetype]) return res.status(404).json({ error: 'unknown archetype' });
    next();
  });

  router.get('/page', route((req, res) => {
    const { archetype } = req.params;
    const args = PAGE_QUERIES[archetype](req.query);
    const db = dbFor(archetype);
    const timer = createTimer();
    const body = timer.time('load', () => PAGE_BUILDERS[archetype](db, args));
    const json = timer.time('serialize', () => JSON.stringify(body));
    res.setHeader('Server-Timing', timer.header());
    res.type('application/json').send(json);
  }));

  router.get('/record/:id', route((req, res) => {
    if (req.params.archetype !== 'browser') return res.status(404).json({ error: 'not found' });
    const id = queryPage({ id: req.params.id }, 'id');
    const db = dbFor('browser');
    const timer = createTimer();
    const record = timer.time('load', () => db.getById(id));
    res.setHeader('Server-Timing', timer.header());
    if (!record) return res.status(404).json({ error: 'not found' });
    res.json(record);
  }));

  router.post('/edit', route((req, res) => {
    if (req.params.archetype !== 'table') return res.status(404).json({ error: 'not found' });
    const ok = dbFor('table').update(bodyId(req.body), bodyString(req.body, 'column'), bodyString(req.body, 'value'));
    if (!ok) throw new BadRequest('invalid edit');
    res.json({ ok: true });
  }));

  router.post('/delete', route((req, res) => {
    if (req.params.archetype !== 'table') return res.status(404).json({ error: 'not found' });
    res.json({ deleted: dbFor('table').delete(bodyIdList(req.body)) });
  }));

  router.post('/cell', route((req, res) => {
    if (req.params.archetype !== 'grid') return res.status(404).json({ error: 'not found' });
    const ok = dbFor('grid').updateCell(bodyId(req.body), bodyString(req.body, 'field'), bodyString(req.body, 'value'));
    if (!ok) throw new BadRequest('invalid cell value');
    res.json({ ok: true });
  }));

  router.post('/bulk', route((req, res) => {
    if (req.params.archetype !== 'grid') return res.status(404).json({ error: 'not found' });
    const ok = dbFor('grid').bulkFill(bodyIdList(req.body), bodyString(req.body, 'field'), bodyString(req.body, 'value'));
    if (!ok) throw new BadRequest('invalid bulk value');
    res.json({ ok: true });
  }));

  function closeAll() {
    for (const [arch, db] of current) if (MUTABLE[arch]) db.dispose();
    for (const db of readOnly.values()) db.close();
    current.clear();
    readOnly.clear();
  }

  return { open, firstPage, router, closeAll };
}
