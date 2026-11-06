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

class Record {
  constructor(row) {
    this.id = row.id;
    this.name = row.name;
    this.status = row.status;
    this.createdDate = row.createdDate;
    this.value = row.value;
    this.description = row.description;
    this.category = row.category;
    this.tags = row.tags;
  }

  get isActive() {
    return this.status === 'active';
  }

  get formattedValue() {
    return `$${this.value.toLocaleString()}`;
  }
}

class BrowserService {
  constructor(db) {
    this._db = db;
  }

  page(opts) {
    const result = this._db.page(opts);
    return {
      rows: result.rows.map(r => new Record(r)),
      total: result.total,
      totalPages: result.totalPages,
      page: result.page,
    };
  }

  getById(id) {
    const row = this._db.getById(id);
    return row ? new Record(row) : null;
  }
}

class BrowserState {
  constructor(query, body) {
    const src = { ...query, ...body };
    this.sortCol = src.sortCol || '';
    this.sortDir = src.sortDir || '';
    this.search = src.search || '';
    this.statusFilter = src.statusFilter || 'all';
    this.page = intParam(src.page, 'page');
    this.selectedId = intParam(src.selectedId, 'selectedId', null);
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

class BrowserController {
  constructor(service, basePath) {
    this._service = service;
    this._basePath = basePath;
  }

  async renderContent(state, timer = createTimer()) {
    const { sortCol, sortDir, search, statusFilter, page, selectedId } = state;
    const { result, selectedRecord } = timer.time('load', () => ({
      result: this._service.page({ q: search, status: statusFilter, col: sortCol, dir: sortDir, page }),
      selectedRecord: selectedId ? this._service.getById(selectedId) : null,
    }));
    return timer.timeAsync('render', () => ejs.renderFile(join(VIEWS, '_content.ejs'), {
      rows: result.rows,
      totalRows: result.total,
      totalPages: result.totalPages,
      page: result.page,
      sortCol, sortDir, search, statusFilter, selectedId, selectedRecord,
      columns: COLUMNS, statuses: STATUSES, basePath: this._basePath,
    }, { cache: true }));
  }

  async sendContent(res, state) {
    const timer = createTimer();
    sendTimed(res, timer, await this.renderContent(state, timer));
  }

  async search(req, res) {
    const state = new BrowserState(req.query);
    state.search = req.query.searchInput || '';
    state.page = 1;
    await this.sendContent(res, state);
  }

  async statusFilter(req, res) {
    const state = new BrowserState(req.query);
    state.statusFilter = req.query.status || 'all';
    state.page = 1;
    await this.sendContent(res, state);
  }

  async sort(req, res) {
    const state = new BrowserState(req.query);
    state.applySortToggle(req.query.col);
    await this.sendContent(res, state);
  }

  async paginate(req, res) {
    const state = new BrowserState(req.query);
    state.page = intParam(req.query.p, 'p');
    await this.sendContent(res, state);
  }

  async select(req, res) {
    const state = new BrowserState(req.query);
    state.selectedId = intParam(req.query.id, 'id', null);
    await this.sendContent(res, state);
  }

  async closeDetail(req, res) {
    const state = new BrowserState(req.query);
    state.selectedId = null;
    await this.sendContent(res, state);
  }
}

const readOnly = new Map();
let activeDb = null;

export async function render(sqlitePath, opts, timer = createTimer()) {
  if (!readOnly.has(sqlitePath)) readOnly.set(sqlitePath, openBrowserDb(sqlitePath));
  activeDb = readOnly.get(sqlitePath);
  const service = new BrowserService(activeDb);
  const result = timer.time('load', () => service.page({ q: '', status: 'all', col: '', dir: '', page: 1 }));
  const basePath = `/${opts.archetype}/13-htmx-ejs-conventional`;
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
  const basePath = `/${archetype}/13-htmx-ejs-conventional`;
  const controller = new BrowserController(
    { page: (...a) => new BrowserService(activeDb).page(...a), getById: (...a) => new BrowserService(activeDb).getById(...a) },
    basePath,
  );

  router.get('/search', route(async (req, res) => controller.search(req, res)));
  router.get('/status-filter', route(async (req, res) => controller.statusFilter(req, res)));
  router.get('/sort', route(async (req, res) => controller.sort(req, res)));
  router.get('/page', route(async (req, res) => controller.paginate(req, res)));
  router.get('/select', route(async (req, res) => controller.select(req, res)));
  router.get('/close-detail', route(async (req, res) => controller.closeDetail(req, res)));

  return router;
}
