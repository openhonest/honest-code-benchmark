import ejs from 'ejs';
import { Router } from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIEWS = join(__dirname, 'views');
const ROWS_PER_PAGE = 25;

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'createdDate', label: 'Created' },
  { key: 'value', label: 'Value' },
];

const STATUSES = ['active', 'inactive', 'pending', 'archived', 'flagged'];

let browserData = [];

function filterRows(rows, search, statusFilter) {
  let result = rows;
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(r => r.name.toLowerCase().includes(s));
  }
  if (statusFilter && statusFilter !== 'all') {
    result = result.filter(r => r.status === statusFilter);
  }
  return result;
}

function sortRows(rows, col, dir) {
  if (!col || !dir) return rows;
  return [...rows].sort((a, b) => {
    const av = a[col], bv = b[col];
    let cmp = 0;
    if (typeof av === 'string') cmp = av.localeCompare(bv);
    else cmp = av - bv;
    return dir === 'desc' ? -cmp : cmp;
  });
}

function computeView(sortCol, sortDir, search, statusFilter, page) {
  let rows = filterRows(browserData, search, statusFilter);
  rows = sortRows(rows, sortCol, sortDir);
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
  const p = Math.min(Math.max(1, page), totalPages);
  const pageRows = rows.slice((p - 1) * ROWS_PER_PAGE, p * ROWS_PER_PAGE);
  return { pageRows, totalRows, totalPages, page: p };
}

function parseState(query, body) {
  const src = { ...query, ...body };
  return {
    sortCol: src.sortCol || '',
    sortDir: src.sortDir || '',
    search: src.search || '',
    statusFilter: src.statusFilter || 'all',
    page: parseInt(src.page, 10) || 1,
    selectedId: src.selectedId || '',
  };
}

async function renderContent(state, basePath) {
  const { sortCol, sortDir, search, statusFilter, page, selectedId } = state;
  const view = computeView(sortCol, sortDir, search, statusFilter, page);
  const selectedRecord = selectedId ? browserData.find(r => String(r.id) === String(selectedId)) : null;
  return ejs.renderFile(join(VIEWS, '_content.ejs'), {
    ...view, rows: view.pageRows,
    sortCol, sortDir, search, statusFilter, selectedId, selectedRecord,
    columns: COLUMNS, statuses: STATUSES, basePath,
  });
}

async function renderDetail(selectedId, basePath) {
  const record = browserData.find(r => String(r.id) === String(selectedId));
  if (!record) return '';
  return ejs.renderFile(join(VIEWS, '_detail.ejs'), { record, basePath });
}

export async function render(data, opts) {
  browserData = [...data];
  const basePath = `/${opts.archetype}/10-htmx-ejs`;
  const view = computeView('', '', '', 'all', 1);
  return ejs.renderFile(join(VIEWS, 'page.ejs'), {
    ...view,
    sortCol: '', sortDir: '', search: '', statusFilter: 'all',
    selectedId: '', selectedRecord: null,
    columns: COLUMNS, statuses: STATUSES, basePath,
    archetype: opts.archetype, arm: opts.arm, dataRows: opts.rows,
  });
}

export function partialRouter(dataDir, archetype) {
  const router = Router();
  const basePath = `/${archetype}/10-htmx-ejs`;

  router.get('/search', async (req, res) => {
    const state = parseState(req.query);
    state.search = req.query.searchInput || '';
    state.page = 1;
    res.send(await renderContent(state, basePath));
  });

  router.get('/status-filter', async (req, res) => {
    const state = parseState(req.query);
    state.statusFilter = req.query.status || 'all';
    state.page = 1;
    res.send(await renderContent(state, basePath));
  });

  router.get('/sort', async (req, res) => {
    const state = parseState(req.query);
    const col = req.query.col;
    if (state.sortCol === col) {
      if (state.sortDir === 'asc') state.sortDir = 'desc';
      else { state.sortCol = ''; state.sortDir = ''; }
    } else {
      state.sortCol = col;
      state.sortDir = 'asc';
    }
    res.send(await renderContent(state, basePath));
  });

  router.get('/page', async (req, res) => {
    const state = parseState(req.query);
    state.page = parseInt(req.query.p, 10) || 1;
    res.send(await renderContent(state, basePath));
  });

  router.get('/select', async (req, res) => {
    const state = parseState(req.query);
    state.selectedId = req.query.id || '';
    res.send(await renderContent(state, basePath));
  });

  router.get('/close-detail', async (req, res) => {
    const state = parseState(req.query);
    state.selectedId = '';
    res.send(await renderContent(state, basePath));
  });

  return router;
}
