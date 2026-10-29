import ejs from 'ejs';
import { Router } from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIEWS = join(__dirname, 'views');
const ROWS_PER_PAGE = 25;

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'hireDate', label: 'Hire Date' },
  { key: 'salary', label: 'Salary' },
  { key: 'active', label: 'Active' },
];

let tableData = [];

function filterRows(rows, text) {
  if (!text) return rows;
  const ft = text.toLowerCase();
  return rows.filter(r =>
    r.name.toLowerCase().includes(ft) ||
    r.email.toLowerCase().includes(ft) ||
    r.department.toLowerCase().includes(ft)
  );
}

function sortRows(rows, col, dir) {
  if (!col || !dir) return rows;
  return [...rows].sort((a, b) => {
    const av = a[col], bv = b[col];
    let cmp = 0;
    if (typeof av === 'string') cmp = av.localeCompare(bv);
    else if (typeof av === 'boolean') cmp = av === bv ? 0 : av ? -1 : 1;
    else cmp = av - bv;
    return dir === 'desc' ? -cmp : cmp;
  });
}

function computeView(sortCol, sortDir, filter, page, selectedIds) {
  let rows = filterRows(tableData, filter);
  rows = sortRows(rows, sortCol, sortDir);
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
  const p = Math.min(Math.max(1, page), totalPages);
  const pageRows = rows.slice((p - 1) * ROWS_PER_PAGE, p * ROWS_PER_PAGE);
  const visibleIds = pageRows.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds[id]);
  const selCount = Object.keys(selectedIds).length;
  return { pageRows, totalRows, totalPages, page: p, allVisibleSelected, selCount };
}

function parseState(query, body) {
  const src = { ...query, ...body };
  return {
    sortCol: src.sortCol || '',
    sortDir: src.sortDir || '',
    filter: src.filter || '',
    page: parseInt(src.page, 10) || 1,
    selectedIds: (() => { try { return JSON.parse(src.selected || '{}'); } catch { return {}; } })(),
  };
}

async function renderContent(state, basePath) {
  const { sortCol, sortDir, filter, page, selectedIds } = state;
  const view = computeView(sortCol, sortDir, filter, page, selectedIds);
  return ejs.renderFile(join(VIEWS, '_content.ejs'), {
    ...view, rows: view.pageRows,
    sortCol, sortDir, filter, selectedIds, columns: COLUMNS, basePath,
  });
}

export async function render(data, opts) {
  tableData = [...data];
  const basePath = `/${opts.archetype}/10-htmx-ejs`;
  const view = computeView('', '', '', 1, {});
  return ejs.renderFile(join(VIEWS, 'page.ejs'), {
    ...view,
    sortCol: '', sortDir: '', filter: '', selectedIds: {},
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
    state.filter = req.query.filterInput || '';
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
    const id = req.query.id;
    if (state.selectedIds[id]) delete state.selectedIds[id];
    else state.selectedIds[id] = true;
    res.send(await renderContent(state, basePath));
  });

  router.post('/toggle-all', async (req, res) => {
    const state = parseState(req.query, req.body);
    const view = computeView(state.sortCol, state.sortDir, state.filter, state.page, state.selectedIds);
    const ids = view.pageRows.map(r => r.id);
    const all = ids.every(id => state.selectedIds[id]);
    if (all) ids.forEach(id => delete state.selectedIds[id]);
    else ids.forEach(id => { state.selectedIds[id] = true; });
    res.send(await renderContent(state, basePath));
  });

  router.post('/delete', async (req, res) => {
    const state = parseState(req.query, req.body);
    tableData = tableData.filter(r => !state.selectedIds[r.id]);
    state.selectedIds = {};
    const totalPages = Math.max(1, Math.ceil(tableData.length / ROWS_PER_PAGE));
    if (state.page > totalPages) state.page = totalPages;
    res.send(await renderContent(state, basePath));
  });

  router.get('/edit-cell', async (req, res) => {
    const id = req.query.id;
    const col = req.query.col;
    const row = tableData.find(r => r.id === id);
    if (!row) { res.status(404).send(''); return; }
    const html = await ejs.renderFile(join(VIEWS, '_edit-cell.ejs'), { id, col, value: row[col], basePath });
    res.send(html);
  });

  router.post('/commit-edit', async (req, res) => {
    const state = parseState(req.query, req.body);
    const id = req.query.id;
    const col = req.query.col;
    const value = req.body?.editValue ?? req.query.editValue ?? '';
    const row = tableData.find(r => r.id === id);
    if (row) {
      row[col] = col === 'salary' ? (parseInt(value, 10) || row[col]) : value;
    }
    res.send(await renderContent(state, basePath));
  });

  return router;
}
