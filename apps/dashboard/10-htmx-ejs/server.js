import ejs from 'ejs';
import { Router } from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIEWS = join(__dirname, 'views');
const ROWS_PER_PAGE = 25;

const COLUMNS = [
  { key: 'id', label: 'Order ID' },
  { key: 'date', label: 'Date' },
  { key: 'customerName', label: 'Customer' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'items', label: 'Items' },
];

let dashboardData = [];

function filterRows(rows, category, status, dateFrom, dateTo) {
  let out = rows;
  if (category && category !== 'All') out = out.filter(r => r.category === category);
  if (status && status !== 'All') out = out.filter(r => r.status === status);
  if (dateFrom) out = out.filter(r => r.date >= dateFrom);
  if (dateTo) out = out.filter(r => r.date <= dateTo);
  return out;
}

function sortRows(rows, col, dir) {
  if (!col || !dir) return rows;
  return [...rows].sort((a, b) => {
    const av = a[col], bv = b[col];
    let cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return dir === 'desc' ? -cmp : cmp;
  });
}

function computeMetrics(rows) {
  const totalOrders = rows.length;
  const totalRevenue = rows.reduce((s, r) => s + r.amount, 0);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const uniqueCustomers = new Set(rows.map(r => r.customerName)).size;
  return { totalOrders, totalRevenue, avgOrder, uniqueCustomers };
}

function computeView(sortCol, sortDir, category, status, dateFrom, dateTo, page) {
  const filtered = filterRows(dashboardData, category, status, dateFrom, dateTo);
  const sorted = sortRows(filtered, sortCol, sortDir);
  const metrics = computeMetrics(filtered);
  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
  const p = Math.min(Math.max(1, page), totalPages);
  const pageRows = sorted.slice((p - 1) * ROWS_PER_PAGE, p * ROWS_PER_PAGE);
  const categories = [...new Set(dashboardData.map(r => r.category))].sort();
  const statuses = [...new Set(dashboardData.map(r => r.status))].sort();
  return { pageRows, totalRows, totalPages, page: p, metrics, categories, statuses };
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
    page: parseInt(src.page, 10) || 1,
  };
}

async function renderContent(state, basePath) {
  const { sortCol, sortDir, category, status, dateFrom, dateTo, page } = state;
  const view = computeView(sortCol, sortDir, category, status, dateFrom, dateTo, page);
  return ejs.renderFile(join(VIEWS, '_content.ejs'), {
    ...view, rows: view.pageRows,
    sortCol, sortDir, category, status, dateFrom, dateTo,
    columns: COLUMNS, basePath,
  });
}

export async function render(data, opts) {
  dashboardData = [...data];
  const basePath = `/${opts.archetype}/10-htmx-ejs`;
  const view = computeView('', '', 'All', 'All', '', '', 1);
  return ejs.renderFile(join(VIEWS, 'page.ejs'), {
    ...view,
    sortCol: '', sortDir: '', category: 'All', status: 'All', dateFrom: '', dateTo: '',
    columns: COLUMNS, basePath,
    archetype: opts.archetype, arm: opts.arm, dataRows: opts.rows,
  });
}

export function partialRouter(dataDir, archetype) {
  const router = Router();
  const basePath = `/${archetype}/10-htmx-ejs`;

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

  router.get('/filter', async (req, res) => {
    const state = parseState(req.query);
    if (req.query.categoryInput !== undefined) state.category = req.query.categoryInput;
    if (req.query.statusInput !== undefined) state.status = req.query.statusInput;
    if (req.query.dateFromInput !== undefined) state.dateFrom = req.query.dateFromInput;
    if (req.query.dateToInput !== undefined) state.dateTo = req.query.dateToInput;
    state.page = 1;
    res.send(await renderContent(state, basePath));
  });

  router.get('/page', async (req, res) => {
    const state = parseState(req.query);
    state.page = parseInt(req.query.p, 10) || 1;
    res.send(await renderContent(state, basePath));
  });

  return router;
}
