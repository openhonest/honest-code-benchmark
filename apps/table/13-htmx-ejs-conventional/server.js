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

class Employee {
  constructor(row) {
    this.id = row.id;
    this.name = row.name;
    this.email = row.email;
    this.department = row.department;
    this.hireDate = row.hireDate;
    this.salary = row.salary;
    this.active = row.active;
  }

  get isActive() {
    return Boolean(this.active);
  }

  get formattedSalary() {
    return `$${this.salary.toLocaleString()}`;
  }
}

class TableService {
  constructor(db) {
    this._db = db;
  }

  page(opts) {
    const result = this._db.page(opts);
    return {
      rows: result.rows.map(r => new Employee(r)),
      total: result.total,
      totalPages: result.totalPages,
      page: result.page,
    };
  }

  getById(id) {
    const row = this._db.getById(id);
    return row ? new Employee(row) : null;
  }

  delete(ids) {
    this._db.delete(ids);
  }

  update(id, col, value) {
    return this._db.update(id, col, value);
  }

  dispose() {
    this._db.dispose();
  }
}

class RequestState {
  constructor(query, body) {
    const src = { ...query, ...body };
    this.sortCol = src.sortCol || '';
    this.sortDir = src.sortDir || '';
    this.filter = src.filter || '';
    this.page = intParam(src.page, 'page');
    this.selectedIds = selectionParam(src.selected);
  }

  get selectedCount() {
    return Object.keys(this.selectedIds).length;
  }

  get selectedIdList() {
    return Object.keys(this.selectedIds).map(Number);
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

  clearSelection() {
    this.selectedIds = {};
  }

  applySortToggle(col) {
    if (this.sortCol === col) {
      if (this.sortDir === 'asc') this.sortDir = 'desc';
      else { this.sortCol = ''; this.sortDir = ''; }
    } else {
      this.sortCol = col;
      this.sortDir = 'asc';
    }
  }
}

class TableController {
  constructor(service, basePath) {
    this._service = service;
    this._basePath = basePath;
  }

  async renderContent(state, timer = createTimer()) {
    const result = timer.time('load', () => this._service.page({
      q: state.filter, col: state.sortCol, dir: state.sortDir, page: state.page,
    }));
    const visibleIds = result.rows.map(r => r.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => state.selectedIds[id]);
    return timer.timeAsync('render', () => ejs.renderFile(join(VIEWS, '_content.ejs'), {
      rows: result.rows,
      totalRows: result.total,
      totalPages: result.totalPages,
      page: result.page,
      sortCol: state.sortCol,
      sortDir: state.sortDir,
      filter: state.filter,
      selectedIds: state.selectedIds,
      allVisibleSelected,
      selCount: state.selectedCount,
      columns: COLUMNS,
      basePath: this._basePath,
    }, { cache: true }));
  }

  async sendContent(res, state) {
    const timer = createTimer();
    sendTimed(res, timer, await this.renderContent(state, timer));
  }

  async sort(req, res) {
    const state = new RequestState(req.query);
    state.applySortToggle(req.query.col);
    await this.sendContent(res, state);
  }

  async filter(req, res) {
    const state = new RequestState(req.query);
    state.filter = req.query.filterInput || '';
    state.page = 1;
    await this.sendContent(res, state);
  }

  async paginate(req, res) {
    const state = new RequestState(req.query);
    state.page = intParam(req.query.p, 'p');
    await this.sendContent(res, state);
  }

  async toggle(req, res) {
    const state = new RequestState(req.query, req.body);
    state.toggleRow(requireId(req.query.id));
    await this.sendContent(res, state);
  }

  async toggleAll(req, res) {
    const state = new RequestState(req.query, req.body);
    const result = this._service.page({
      q: state.filter, col: state.sortCol, dir: state.sortDir, page: state.page,
    });
    state.toggleAll(result.rows.map(r => r.id));
    await this.sendContent(res, state);
  }

  async delete(req, res) {
    const state = new RequestState(req.query, req.body);
    const ids = state.selectedIdList;
    if (ids.length > 0) this._service.delete(ids);
    state.clearSelection();
    await this.sendContent(res, state);
  }

  async editCell(req, res) {
    const id = requireId(req.query.id);
    const col = req.query.col;
    if (!TABLE_EDITABLE.has(col)) throw new BadRequest('column is not editable');
    const timer = createTimer();
    const employee = timer.time('load', () => this._service.getById(id));
    if (!employee) { res.status(404).send(''); return; }
    const html = await timer.timeAsync('render', () => ejs.renderFile(
      join(VIEWS, '_edit-cell.ejs'), { id, col, value: employee[col], basePath: this._basePath }, { cache: true },
    ));
    sendTimed(res, timer, html);
  }

  async commitEdit(req, res) {
    const state = new RequestState(req.query, req.body);
    const id = requireId(req.query.id);
    const col = req.query.col;
    const value = req.body?.editValue ?? req.query.editValue ?? '';
    if (!this._service.update(id, col, value)) throw new BadRequest('invalid edit');
    await this.sendContent(res, state);
  }
}

let service = null;

export async function render(sqlitePath, opts, timer = createTimer()) {
  service?.dispose();
  service = new TableService(openMutableTableDb(sqlitePath));
  const result = timer.time('load', () => service.page({ q: '', col: '', dir: '', page: 1 }));
  const basePath = `/${opts.archetype}/13-htmx-ejs-conventional`;
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
  router.use((req, res, next) => (service || req.path === '/' ? next() : next(new BadRequest('load the page before sending partial requests'))));
  const basePath = `/${archetype}/13-htmx-ejs-conventional`;
  const controller = new TableController({ page: (...a) => service.page(...a), getById: (...a) => service.getById(...a), delete: (...a) => service.delete(...a), update: (...a) => service.update(...a) }, basePath);

  router.get('/sort', route(async (req, res) => controller.sort(req, res)));
  router.get('/filter', route(async (req, res) => controller.filter(req, res)));
  router.get('/page', route(async (req, res) => controller.paginate(req, res)));
  router.post('/toggle', route(async (req, res) => controller.toggle(req, res)));
  router.post('/toggle-all', route(async (req, res) => controller.toggleAll(req, res)));
  router.post('/delete', route(async (req, res) => controller.delete(req, res)));
  router.get('/edit-cell', route(async (req, res) => controller.editCell(req, res)));
  router.post('/commit-edit', route(async (req, res) => controller.commitEdit(req, res)));

  return router;
}

export function close() {
  service?.dispose();
  service = null;
}
