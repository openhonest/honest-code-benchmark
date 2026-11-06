import ejs from 'ejs';
import { Router } from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openMutableGridDb } from '../../lib/sqlite.js';
import { createTimer } from '../../lib/timing.js';
import { route, intParam, strParam, selectionParam, sendTimed, requireId, BadRequest } from '../../lib/http-util.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIEWS = join(__dirname, 'views');

const QUARTER_FIELDS = ['q1', 'q2', 'q3', 'q4'];

let db = null;

function fmt(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseState(query, body) {
  const src = { ...query, ...body };
  return {
    categoryFilter: src.categoryFilter || 'All',
    page: intParam(src.page, 'page'),
    selectedIds: selectionParam(src.selected),
    bulkQuarter: src.bulkQuarter || 'q1',
    bulkValue: src.bulkValue || '',
  };
}

async function renderContent(state, basePath, timer = createTimer()) {
  const { categoryFilter, page, selectedIds, bulkQuarter, bulkValue } = state;
  const { result, totals, categories } = timer.time('load', () => ({
    result: db.page({ category: categoryFilter, page }),
    totals: db.totals({ category: categoryFilter }),
    categories: db.categories(),
  }));
  const visibleIds = result.rows.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds[id]);
  const selCount = Object.keys(selectedIds).length;
  return timer.timeAsync('render', () => ejs.renderFile(join(VIEWS, '_content.ejs'), {
    rows: result.rows,
    totalRows: result.total,
    totalPages: result.totalPages,
    page: result.page,
    allVisibleSelected, selCount, categories, totals,
    categoryFilter, selectedIds, basePath, bulkQuarter, bulkValue, fmt,
  }, { cache: true }));
}

async function sendContent(res, state, basePath) {
  const timer = createTimer();
  sendTimed(res, timer, await renderContent(state, basePath, timer));
}

// Opening the working copy is setup and is not timed. Each page load gets a
// fresh copy of the pristine database, and the previous copy is removed.
export async function render(sqlitePath, opts, timer = createTimer()) {
  db?.dispose();
  db = openMutableGridDb(sqlitePath);
  const { result, totals, categories } = timer.time('load', () => ({
    result: db.page({ category: 'All', page: 1 }),
    totals: db.totals({ category: 'All' }),
    categories: db.categories(),
  }));
  const basePath = `/${opts.archetype}/10-htmx-ejs`;
  return timer.timeAsync('render', () => ejs.renderFile(join(VIEWS, 'page.ejs'), {
    pageRows: result.rows,
    totalRows: result.total,
    totalPages: result.totalPages,
    page: result.page,
    allVisibleSelected: false, selCount: 0, categories, totals,
    categoryFilter: 'All', selectedIds: {}, basePath,
    bulkQuarter: 'q1', bulkValue: '', fmt,
    archetype: opts.archetype, arm: opts.arm, dataRows: opts.rows,
  }, { cache: true }));
}

export function partialRouter(dataDir, archetype) {
  const router = Router();
  // Partials act on the working copy that the last page load opened.
  router.use((req, res, next) => (db || req.path === '/' ? next() : next(new BadRequest('load the page before sending partial requests'))));
  const basePath = `/${archetype}/10-htmx-ejs`;

  router.get('/filter', route(async (req, res) => {
    const state = parseState(req.query);
    state.categoryFilter = req.query.cat || 'All';
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
    const result = db.page({ category: state.categoryFilter, page: state.page });
    const ids = result.rows.map(r => r.id);
    const all = ids.every(id => state.selectedIds[id]);
    if (all) ids.forEach(id => delete state.selectedIds[id]);
    else ids.forEach(id => { state.selectedIds[id] = true; });
    await sendContent(res, state, basePath);
  }));

  router.get('/edit-cell', route(async (req, res) => {
    const id = requireId(req.query.id);
    const col = req.query.col;
    if (!QUARTER_FIELDS.includes(col)) { res.status(400).send(''); return; }
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
    if (!db.updateCell(id, col, value)) throw new BadRequest('invalid cell value');
    await sendContent(res, state, basePath);
  }));

  router.post('/bulk-fill', route(async (req, res) => {
    const state = parseState(req.query, req.body);
    const quarter = state.bulkQuarter;
    const ids = Object.keys(state.selectedIds).map(Number);
    if (ids.length > 0) {
      if (!db.bulkFill(ids, quarter, state.bulkValue)) throw new BadRequest('invalid bulk value');
    }
    await sendContent(res, state, basePath);
  }));

  return router;
}
