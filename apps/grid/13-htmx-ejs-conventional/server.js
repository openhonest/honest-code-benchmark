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

class BudgetItem {
  constructor(row) {
    this.id = row.id;
    this.description = row.description;
    this.category = row.category;
    this.q1 = row.q1;
    this.q2 = row.q2;
    this.q3 = row.q3;
    this.q4 = row.q4;
    this.budgetTarget = row.budgetTarget;
  }

  get total() {
    return this.q1 + this.q2 + this.q3 + this.q4;
  }

  get variance() {
    return this.total - this.budgetTarget;
  }

  quarterValue(quarter) {
    return this[quarter];
  }
}

class GridService {
  constructor(db) {
    this._db = db;
  }

  page(opts) {
    const result = this._db.page(opts);
    return {
      rows: result.rows.map(r => new BudgetItem(r)),
      total: result.total,
      totalPages: result.totalPages,
      page: result.page,
    };
  }

  totals(opts) {
    return this._db.totals(opts);
  }

  categories() {
    return this._db.categories();
  }

  getById(id) {
    const row = this._db.getById(id);
    return row ? new BudgetItem(row) : null;
  }

  updateCell(id, col, value) {
    return this._db.updateCell(id, col, value);
  }

  bulkFill(ids, quarter, value) {
    return this._db.bulkFill(ids, quarter, value);
  }

  dispose() {
    this._db.dispose();
  }
}

class GridState {
  constructor(query, body) {
    const src = { ...query, ...body };
    this.categoryFilter = src.categoryFilter || 'All';
    this.page = intParam(src.page, 'page');
    this.selectedIds = selectionParam(src.selected);
    this.bulkQuarter = src.bulkQuarter || 'q1';
    this.bulkValue = src.bulkValue || '';
  }

  get selectedCount() {
    return Object.keys(this.selectedIds).length;
  }

  toggleRow(id) {
    if (this.selectedIds[id]) delete this.selectedIds[id];
    else this.selectedIds[id] = true;
  }

  toggleAll(visibleIds) {
    const allSelected = visibleIds.every(id => this.selectedIds[id]);
    if (allSelected) visibleIds.forEach(id => delete this.selectedIds[id]);
    else visibleIds.forEach(id => { this.selectedIds[id] = true; });
  }
}

function fmt(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

class GridController {
  constructor(service, basePath) {
    this._service = service;
    this._basePath = basePath;
  }

  async renderContent(state, timer = createTimer()) {
    const { categoryFilter, page, selectedIds, bulkQuarter, bulkValue } = state;
    const { result, totals, categories } = timer.time('load', () => ({
      result: this._service.page({ category: categoryFilter, page }),
      totals: this._service.totals({ category: categoryFilter }),
      categories: this._service.categories(),
    }));
    const visibleIds = result.rows.map(r => r.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds[id]);
    return timer.timeAsync('render', () => ejs.renderFile(join(VIEWS, '_content.ejs'), {
      rows: result.rows,
      totalRows: result.total,
      totalPages: result.totalPages,
      page: result.page,
      allVisibleSelected, selCount: state.selectedCount, categories, totals,
      categoryFilter, selectedIds, basePath: this._basePath, bulkQuarter, bulkValue, fmt,
    }, { cache: true }));
  }

  async sendContent(res, state) {
    const timer = createTimer();
    sendTimed(res, timer, await this.renderContent(state, timer));
  }

  async filter(req, res) {
    const state = new GridState(req.query);
    state.categoryFilter = req.query.cat || 'All';
    state.page = 1;
    await this.sendContent(res, state);
  }

  async paginate(req, res) {
    const state = new GridState(req.query);
    state.page = intParam(req.query.p, 'p');
    await this.sendContent(res, state);
  }

  async toggle(req, res) {
    const state = new GridState(req.query, req.body);
    state.toggleRow(requireId(req.query.id));
    await this.sendContent(res, state);
  }

  async toggleAll(req, res) {
    const state = new GridState(req.query, req.body);
    const result = this._service.page({ category: state.categoryFilter, page: state.page });
    state.toggleAll(result.rows.map(r => r.id));
    await this.sendContent(res, state);
  }

  async editCell(req, res) {
    const id = requireId(req.query.id);
    const col = req.query.col;
    if (!QUARTER_FIELDS.includes(col)) { res.status(400).send(''); return; }
    const timer = createTimer();
    const item = timer.time('load', () => this._service.getById(id));
    if (!item) { res.status(404).send(''); return; }
    const html = await timer.timeAsync('render', () => ejs.renderFile(
      join(VIEWS, '_edit-cell.ejs'), { id, col, value: item[col], basePath: this._basePath }, { cache: true },
    ));
    sendTimed(res, timer, html);
  }

  async commitEdit(req, res) {
    const state = new GridState(req.query, req.body);
    const id = requireId(req.query.id);
    const col = req.query.col;
    const value = req.body?.editValue ?? req.query.editValue ?? '';
    if (!this._service.updateCell(id, col, value)) throw new BadRequest('invalid cell value');
    await this.sendContent(res, state);
  }

  async bulkFill(req, res) {
    const state = new GridState(req.query, req.body);
    const ids = Object.keys(state.selectedIds).map(Number);
    if (ids.length > 0) {
      if (!this._service.bulkFill(ids, state.bulkQuarter, state.bulkValue)) throw new BadRequest('invalid bulk value');
    }
    await this.sendContent(res, state);
  }
}

let service = null;

export async function render(sqlitePath, opts, timer = createTimer()) {
  service?.dispose();
  service = new GridService(openMutableGridDb(sqlitePath));
  const { result, totals, categories } = timer.time('load', () => ({
    result: service.page({ category: 'All', page: 1 }),
    totals: service.totals({ category: 'All' }),
    categories: service.categories(),
  }));
  const basePath = `/${opts.archetype}/13-htmx-ejs-conventional`;
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
  router.use((req, res, next) => (service || req.path === '/' ? next() : next(new BadRequest('load the page before sending partial requests'))));
  const basePath = `/${archetype}/13-htmx-ejs-conventional`;
  const controller = new GridController(
    { page: (...a) => service.page(...a), totals: (...a) => service.totals(...a), categories: () => service.categories(), getById: (...a) => service.getById(...a), updateCell: (...a) => service.updateCell(...a), bulkFill: (...a) => service.bulkFill(...a) },
    basePath,
  );

  router.get('/filter', route(async (req, res) => controller.filter(req, res)));
  router.get('/page', route(async (req, res) => controller.paginate(req, res)));
  router.post('/toggle', route(async (req, res) => controller.toggle(req, res)));
  router.post('/toggle-all', route(async (req, res) => controller.toggleAll(req, res)));
  router.get('/edit-cell', route(async (req, res) => controller.editCell(req, res)));
  router.post('/commit-edit', route(async (req, res) => controller.commitEdit(req, res)));
  router.post('/bulk-fill', route(async (req, res) => controller.bulkFill(req, res)));

  return router;
}

export function close() {
  service?.dispose();
  service = null;
}
