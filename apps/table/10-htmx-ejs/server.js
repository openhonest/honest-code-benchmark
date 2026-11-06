import ejs from 'ejs';
import { Router } from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openMutableTableDb, TABLE_EDITABLE } from '../../lib/sqlite.js';
import { createTimer } from '../../lib/timing.js';
import { route, intParam, strParam, selectionParam, sendTimed, requireId, BadRequest } from '../../lib/http-util.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIEWS = join(__dirname, 'views');

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'hireDate', label: 'Hire Date' },
  { key: 'salary', label: 'Salary' },
  { key: 'active', label: 'Active' },
];

let db = null;

async function renderContent(state, basePath, timer = createTimer()) {
  const { sortCol, sortDir, filter, page, selectedIds } = state;
  const result = timer.time('load', () => db.page({ q: filter, col: sortCol, dir: sortDir, page }));
  const visibleIds = result.rows.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds[id]);
  const selCount = Object.keys(selectedIds).length;
  return timer.timeAsync('render', () => ejs.renderFile(join(VIEWS, '_content.ejs'), {
    rows: result.rows,
    totalRows: result.total,
    totalPages: result.totalPages,
    page: result.page,
    sortCol, sortDir, filter, selectedIds,
    allVisibleSelected, selCount,
    columns: COLUMNS, basePath,
  }, { cache: true }));
}

async function sendContent(res, state, basePath) {
  const timer = createTimer();
  sendTimed(res, timer, await renderContent(state, basePath, timer));
}

function parseState(query, body) {
  const src = { ...query, ...body };
  return {
    sortCol: src.sortCol || '',
    sortDir: src.sortDir || '',
    filter: src.filter || '',
    page: intParam(src.page, 'page'),
    selectedIds: selectionParam(src.selected),
  };
}

// Opening the working copy is setup and is not timed. Each page load gets a
// fresh copy of the pristine database, and the previous copy is removed.
export async function render(sqlitePath, opts, timer = createTimer()) {
  db?.dispose();
  db = openMutableTableDb(sqlitePath);
  const result = timer.time('load', () => db.page({ q: '', col: '', dir: '', page: 1 }));
  const basePath = `/${opts.archetype}/10-htmx-ejs`;
  return timer.timeAsync('render', () => ejs.renderFile(join(VIEWS, 'page.ejs'), {
    pageRows: result.rows,
    totalRows: result.total,
    totalPages: result.totalPages,
    page: result.page,
    sortCol: '', sortDir: '', filter: '', selectedIds: {},
    allVisibleSelected: false, selCount: 0,
    columns: COLUMNS, basePath,
    archetype: opts.archetype, arm: opts.arm, dataRows: opts.rows,
  }, { cache: true }));
}

export function partialRouter(dataDir, archetype) {
  const router = Router();
  // Partials act on the working copy that the last page load opened.
  router.use((req, res, next) => (db || req.path === '/' ? next() : next(new BadRequest('load the page before sending partial requests'))));
  const basePath = `/${archetype}/10-htmx-ejs`;

  router.get('/sort', route(async (req, res) => {
    const state = parseState(req.query);
    const col = req.query.col;
    if (state.sortCol === col) {
      if (state.sortDir === 'asc') state.sortDir = 'desc';
      else { state.sortCol = ''; state.sortDir = ''; }
    } else {
      state.sortCol = col;
      state.sortDir = 'asc';
    }
    await sendContent(res, state, basePath);
  }));

  router.get('/filter', route(async (req, res) => {
    const state = parseState(req.query);
    state.filter = req.query.filterInput || '';
    state.page = 1;
    await sendContent(res, state, basePath);
  }));

  router.get('/page', route(async (req, res) => {
    const state = parseState(req.query);
    state.page = intParam(req.query.p, 'p');
    await sendContent(res, state, basePath);
  }));

  router.post('/toggle', route(async (req, res) => {
    const state = parseState(req.query, req.body);
    const id = requireId(req.query.id);
    if (state.selectedIds[id]) delete state.selectedIds[id];
    else state.selectedIds[id] = true;
    await sendContent(res, state, basePath);
  }));

  router.post('/toggle-all', route(async (req, res) => {
    const state = parseState(req.query, req.body);
    const result = db.page({ q: state.filter, col: state.sortCol, dir: state.sortDir, page: state.page });
    const ids = result.rows.map(r => r.id);
    const all = ids.every(id => state.selectedIds[id]);
    if (all) ids.forEach(id => delete state.selectedIds[id]);
    else ids.forEach(id => { state.selectedIds[id] = true; });
    await sendContent(res, state, basePath);
  }));

  router.post('/delete', route(async (req, res) => {
    const state = parseState(req.query, req.body);
    const ids = Object.keys(state.selectedIds).map(Number);
    if (ids.length > 0) db.delete(ids);
    state.selectedIds = {};
    await sendContent(res, state, basePath);
  }));

  router.get('/edit-cell', route(async (req, res) => {
    const id = requireId(req.query.id);
    const col = req.query.col;
    if (!TABLE_EDITABLE.has(col)) throw new BadRequest('column is not editable');
    const timer = createTimer();
    const row = timer.time('load', () => db.getById(id));
    if (!row) { res.status(404).send(''); return; }
    const html = await timer.timeAsync('render', () => ejs.renderFile(join(VIEWS, '_edit-cell.ejs'), { id, col, value: row[col], basePath }, { cache: true }));
    sendTimed(res, timer, html);
  }));

  router.post('/commit-edit', route(async (req, res) => {
    const state = parseState(req.query, req.body);
    const id = requireId(req.query.id);
    const col = req.query.col;
    const value = req.body?.editValue ?? req.query.editValue ?? '';
    if (!db.update(id, col, value)) throw new BadRequest('invalid edit');
    await sendContent(res, state, basePath);
  }));

  return router;
}
