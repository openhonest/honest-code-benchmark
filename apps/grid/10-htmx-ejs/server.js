import ejs from 'ejs';
import { Router } from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIEWS = join(__dirname, 'views');
const ROWS_PER_PAGE = 25;

const QUARTER_FIELDS = ['q1', 'q2', 'q3', 'q4'];

let gridData = [];

function fmt(n) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function filterRows(rows, category) {
  if (!category || category === 'All') return rows;
  return rows.filter(r => r.category === category);
}

function computeTotals(rows) {
  const t = { q1: 0, q2: 0, q3: 0, q4: 0, budgetTarget: 0 };
  for (const r of rows) {
    t.q1 += r.q1; t.q2 += r.q2; t.q3 += r.q3; t.q4 += r.q4;
    t.budgetTarget += r.budgetTarget;
  }
  t.total = t.q1 + t.q2 + t.q3 + t.q4;
  t.variance = t.total - t.budgetTarget;
  return t;
}

function computeView(categoryFilter, page, selectedIds) {
  const categories = [...new Set(gridData.map(r => r.category))].sort();
  const filtered = filterRows(gridData, categoryFilter);
  const totals = computeTotals(filtered);
  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
  const p = Math.min(Math.max(1, page), totalPages);
  const pageRows = filtered.slice((p - 1) * ROWS_PER_PAGE, p * ROWS_PER_PAGE);
  const visibleIds = pageRows.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds[id]);
  const selCount = Object.keys(selectedIds).length;
  return { pageRows, totalRows, totalPages, page: p, allVisibleSelected, selCount, categories, totals };
}

function parseState(query, body) {
  const src = { ...query, ...body };
  return {
    categoryFilter: src.categoryFilter || 'All',
    page: parseInt(src.page, 10) || 1,
    selectedIds: (() => { try { return JSON.parse(src.selected || '{}'); } catch { return {}; } })(),
    bulkQuarter: src.bulkQuarter || 'q1',
    bulkValue: src.bulkValue || '',
  };
}

async function renderContent(state, basePath) {
  const { categoryFilter, page, selectedIds, bulkQuarter, bulkValue } = state;
  const view = computeView(categoryFilter, page, selectedIds);
  return ejs.renderFile(join(VIEWS, '_content.ejs'), {
    ...view, rows: view.pageRows,
    categoryFilter, selectedIds, basePath, bulkQuarter, bulkValue, fmt,
  });
}

export async function render(data, opts) {
  gridData = [...data];
  const basePath = `/${opts.archetype}/10-htmx-ejs`;
  const view = computeView('All', 1, {});
  return ejs.renderFile(join(VIEWS, 'page.ejs'), {
    ...view,
    categoryFilter: 'All', selectedIds: {}, basePath,
    bulkQuarter: 'q1', bulkValue: '', fmt,
    archetype: opts.archetype, arm: opts.arm, dataRows: opts.rows,
  });
}

export function partialRouter(dataDir, archetype) {
  const router = Router();
  const basePath = `/${archetype}/10-htmx-ejs`;

  router.get('/filter', async (req, res) => {
    const state = parseState(req.query);
    state.categoryFilter = req.query.cat || 'All';
    state.page = 1;
    res.send(await renderContent(state, basePath));
  });

  router.get('/page', async (req, res) => {
    const state = parseState(req.query);
    state.page = parseInt(req.query.p, 10) || 1;
    res.send(await renderContent(state, basePath));
  });

  router.post('/toggle', async (req, res) => {
    const state = parseState(req.query, req.body);
    const id = parseInt(req.query.id, 10);
    if (state.selectedIds[id]) delete state.selectedIds[id];
    else state.selectedIds[id] = true;
    res.send(await renderContent(state, basePath));
  });

  router.post('/toggle-all', async (req, res) => {
    const state = parseState(req.query, req.body);
    const view = computeView(state.categoryFilter, state.page, state.selectedIds);
    const ids = view.pageRows.map(r => r.id);
    const all = ids.every(id => state.selectedIds[id]);
    if (all) ids.forEach(id => delete state.selectedIds[id]);
    else ids.forEach(id => { state.selectedIds[id] = true; });
    res.send(await renderContent(state, basePath));
  });

  router.get('/edit-cell', async (req, res) => {
    const id = parseInt(req.query.id, 10);
    const col = req.query.col;
    if (!QUARTER_FIELDS.includes(col)) { res.status(400).send(''); return; }
    const row = gridData.find(r => r.id === id);
    if (!row) { res.status(404).send(''); return; }
    const html = await ejs.renderFile(join(VIEWS, '_edit-cell.ejs'), { id, col, value: row[col], basePath });
    res.send(html);
  });

  router.post('/commit-edit', async (req, res) => {
    const state = parseState(req.query, req.body);
    const id = parseInt(req.query.id, 10);
    const col = req.query.col;
    const value = req.body?.editValue ?? req.query.editValue ?? '';
    const row = gridData.find(r => r.id === id);
    if (row && QUARTER_FIELDS.includes(col)) {
      const num = parseFloat(value);
      if (!isNaN(num)) row[col] = num;
    }
    res.send(await renderContent(state, basePath));
  });

  router.post('/bulk-fill', async (req, res) => {
    const state = parseState(req.query, req.body);
    const quarter = state.bulkQuarter;
    const num = parseFloat(state.bulkValue);
    if (!isNaN(num) && QUARTER_FIELDS.includes(quarter) && Object.keys(state.selectedIds).length > 0) {
      for (const row of gridData) {
        if (state.selectedIds[row.id]) row[quarter] = num;
      }
    }
    res.send(await renderContent(state, basePath));
  });

  return router;
}
