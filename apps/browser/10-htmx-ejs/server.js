import ejs from 'ejs';
import { Router } from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowserDb } from '../../lib/sqlite.js';
import { createTimer } from '../../lib/timing.js';
import { route, intParam, strParam, selectionParam, sendTimed, BadRequest } from '../../lib/http-util.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIEWS = join(__dirname, 'views');

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'createdDate', label: 'Created' },
  { key: 'value', label: 'Value' },
];

const STATUSES = ['active', 'inactive', 'pending', 'archived', 'flagged'];

let db = null;

function parseState(query, body) {
  const src = { ...query, ...body };
  return {
    sortCol: src.sortCol || '',
    sortDir: src.sortDir || '',
    search: src.search || '',
    statusFilter: src.statusFilter || 'all',
    page: intParam(src.page, 'page'),
    selectedId: intParam(src.selectedId, 'selectedId', null),
  };
}

async function renderContent(state, basePath, timer = createTimer()) {
  const { sortCol, sortDir, search, statusFilter, page, selectedId } = state;
  const { result, selectedRecord } = timer.time('load', () => ({
    result: db.page({ q: search, status: statusFilter, col: sortCol, dir: sortDir, page }),
    selectedRecord: selectedId ? db.getById(selectedId) : null,
  }));
  return timer.timeAsync('render', () => ejs.renderFile(join(VIEWS, '_content.ejs'), {
    rows: result.rows,
    totalRows: result.total,
    totalPages: result.totalPages,
    page: result.page,
    sortCol, sortDir, search, statusFilter, selectedId, selectedRecord,
    columns: COLUMNS, statuses: STATUSES, basePath,
  }, { cache: true }));
}

async function sendContent(res, state, basePath) {
  const timer = createTimer();
  sendTimed(res, timer, await renderContent(state, basePath, timer));
}

const readOnly = new Map();

// Opening the database is setup and is not timed. One read-only connection
// per data size is kept for the life of the server.
export async function render(sqlitePath, opts, timer = createTimer()) {
  if (!readOnly.has(sqlitePath)) readOnly.set(sqlitePath, openBrowserDb(sqlitePath));
  db = readOnly.get(sqlitePath);
  const result = timer.time('load', () => db.page({ q: '', status: 'all', col: '', dir: '', page: 1 }));
  const basePath = `/${opts.archetype}/10-htmx-ejs`;
  return timer.timeAsync('render', () => ejs.renderFile(join(VIEWS, 'page.ejs'), {
    pageRows: result.rows,
    totalRows: result.total,
    totalPages: result.totalPages,
    page: result.page,
    sortCol: '', sortDir: '', search: '', statusFilter: 'all',
    selectedId: null, selectedRecord: null,
    columns: COLUMNS, statuses: STATUSES, basePath,
    archetype: opts.archetype, arm: opts.arm, dataRows: opts.rows,
  }, { cache: true }));
}

export function partialRouter(dataDir, archetype) {
  const router = Router();
  const basePath = `/${archetype}/10-htmx-ejs`;

  router.get('/search', route(async (req, res) => {
    const state = parseState(req.query);
    state.search = req.query.searchInput || '';
    state.page = 1;
    await sendContent(res, state, basePath);
  }));

  router.get('/status-filter', route(async (req, res) => {
    const state = parseState(req.query);
    state.statusFilter = req.query.status || 'all';
    state.page = 1;
    await sendContent(res, state, basePath);
  }));

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

  router.get('/page', route(async (req, res) => {
    const state = parseState(req.query);
    state.page = intParam(req.query.p, 'p');
    await sendContent(res, state, basePath);
  }));

  router.get('/select', route(async (req, res) => {
    const state = parseState(req.query);
    state.selectedId = intParam(req.query.id, 'id', null);
    await sendContent(res, state, basePath);
  }));

  router.get('/close-detail', route(async (req, res) => {
    const state = parseState(req.query);
    state.selectedId = null;
    await sendContent(res, state, basePath);
  }));

  return router;
}
