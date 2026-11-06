import ejs from 'ejs';
import { Router } from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDashboardDb } from '../../lib/sqlite.js';
import { createTimer } from '../../lib/timing.js';
import { route, intParam, strParam, selectionParam, sendTimed, BadRequest } from '../../lib/http-util.js';
import { formatUpdated, REFRESH_EVENT, DEFAULT_REFRESH_SECONDS } from '../../lib/dashboard-refresh.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIEWS = join(__dirname, 'views');

const COLUMNS = [
  { key: 'id', label: 'Order ID' },
  { key: 'date', label: 'Date' },
  { key: 'customerName', label: 'Customer' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'items', label: 'Items' },
];

let db = null;

// The poller's trigger: every N seconds, plus the page-wide refresh event the
// harness dispatches on <body>. N = 0 leaves only the event.
function refreshTrigger(seconds) {
  const onEvent = `${REFRESH_EVENT} from:body`;
  return seconds > 0 ? `every ${seconds}s, ${onEvent}` : onEvent;
}

async function renderContent(state, basePath, timer = createTimer()) {
  const { sortCol, sortDir, category, status, dateFrom, dateTo, page } = state;
  const { result, categories, statuses, loadedAt } = timer.time('load', () => ({
    result: db.page({ category, status, dateFrom, dateTo, col: sortCol, dir: sortDir, page }),
    categories: db.categories(),
    statuses: db.statuses(),
    loadedAt: new Date().toISOString(),
  }));
  const metrics = {
    totalOrders: result.total,
    totalRevenue: result.totalRevenue,
    avgOrder: result.avgOrder,
    uniqueCustomers: result.uniqueCustomers,
  };
  return timer.timeAsync('render', () => ejs.renderFile(join(VIEWS, '_content.ejs'), {
    rows: result.rows,
    totalRows: result.total,
    totalPages: result.totalPages,
    page: result.page,
    metrics, categories, statuses,
    sortCol, sortDir, category, status, dateFrom, dateTo,
    columns: COLUMNS, basePath, loadedAt, updatedText: formatUpdated(loadedAt),
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
    category: src.category || 'All',
    status: src.status || 'All',
    dateFrom: src.dateFrom || '',
    dateTo: src.dateTo || '',
    page: intParam(src.page, 'page'),
  };
}

const readOnly = new Map();

// Opening the database is setup and is not timed. One read-only connection
// per data size is kept for the life of the server.
export async function render(sqlitePath, opts, timer = createTimer()) {
  if (!readOnly.has(sqlitePath)) readOnly.set(sqlitePath, openDashboardDb(sqlitePath));
  db = readOnly.get(sqlitePath);
  const { result, categories, statuses, loadedAt } = timer.time('load', () => ({
    result: db.page({ category: 'All', status: 'All', dateFrom: '', dateTo: '', col: '', dir: '', page: 1 }),
    categories: db.categories(),
    statuses: db.statuses(),
    loadedAt: new Date().toISOString(),
  }));
  const refreshSeconds = opts.refreshSeconds ?? DEFAULT_REFRESH_SECONDS;
  const basePath = `/${opts.archetype}/10-htmx-ejs`;
  return timer.timeAsync('render', () => {
    const metrics = {
      totalOrders: result.total,
      totalRevenue: result.totalRevenue,
      avgOrder: result.avgOrder,
      uniqueCustomers: result.uniqueCustomers,
    };
    return ejs.renderFile(join(VIEWS, 'page.ejs'), {
      pageRows: result.rows,
      totalRows: result.total,
      totalPages: result.totalPages,
      page: result.page,
      metrics, categories, statuses,
      sortCol: '', sortDir: '', category: 'All', status: 'All', dateFrom: '', dateTo: '',
      columns: COLUMNS, basePath, loadedAt, updatedText: formatUpdated(loadedAt),
      refreshSeconds, refreshTrigger: refreshTrigger(refreshSeconds),
      archetype: opts.archetype, arm: opts.arm, dataRows: opts.rows,
    }, { cache: true });
  });
}

export function partialRouter(dataDir, archetype) {
  const router = Router();
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
    if (req.query.categoryInput !== undefined) state.category = req.query.categoryInput;
    if (req.query.statusInput !== undefined) state.status = req.query.statusInput;
    if (req.query.dateFromInput !== undefined) state.dateFrom = req.query.dateFromInput;
    if (req.query.dateToInput !== undefined) state.dateTo = req.query.dateToInput;
    state.page = 1;
    await sendContent(res, state, basePath);
  }));

  // Auto-refresh: re-read the current state from SQLite. The state rides in
  // the hidden inputs and is passed back unchanged, so filters, sort and page
  // survive (db.page clamps the page if the data shrank).
  router.get('/refresh', route(async (req, res) => {
    await sendContent(res, parseState(req.query), basePath);
  }));

  router.get('/page', route(async (req, res) => {
    const state = parseState(req.query);
    state.page = intParam(req.query.p, 'p');
    await sendContent(res, state, basePath);
  }));

  return router;
}
