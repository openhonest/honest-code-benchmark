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

class Order {
  constructor(row) {
    this.id = row.id;
    this.date = row.date;
    this.customerName = row.customerName;
    this.category = row.category;
    this.amount = row.amount;
    this.status = row.status;
    this.items = row.items;
  }

  get formattedAmount() {
    return `$${this.amount.toFixed(2)}`;
  }
}

class DashboardMetrics {
  constructor(result) {
    this.totalOrders = result.total;
    this.totalRevenue = result.totalRevenue;
    this.avgOrder = result.avgOrder;
    this.uniqueCustomers = result.uniqueCustomers;
  }
}

class DashboardService {
  constructor(db) {
    this._db = db;
  }

  page(opts) {
    const result = this._db.page(opts);
    return {
      rows: result.rows.map(r => new Order(r)),
      total: result.total,
      totalPages: result.totalPages,
      page: result.page,
      totalRevenue: result.totalRevenue,
      avgOrder: result.avgOrder,
      uniqueCustomers: result.uniqueCustomers,
    };
  }

  categories() {
    return this._db.categories();
  }

  statuses() {
    return this._db.statuses();
  }
}

class DashboardState {
  constructor(query, body) {
    const src = { ...query, ...body };
    this.sortCol = src.sortCol || '';
    this.sortDir = src.sortDir || '';
    this.category = src.category || 'All';
    this.status = src.status || 'All';
    this.dateFrom = src.dateFrom || '';
    this.dateTo = src.dateTo || '';
    this.page = intParam(src.page, 'page');
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

class DashboardController {
  constructor(service, basePath) {
    this._service = service;
    this._basePath = basePath;
  }

  async renderContent(state, timer = createTimer()) {
    const { sortCol, sortDir, category, status, dateFrom, dateTo, page } = state;
    const { result, categories, statuses, loadedAt } = timer.time('load', () => ({
      result: this._service.page({ category, status, dateFrom, dateTo, col: sortCol, dir: sortDir, page }),
      categories: this._service.categories(),
      statuses: this._service.statuses(),
      loadedAt: new Date().toISOString(),
    }));
    const metrics = new DashboardMetrics(result);
    return timer.timeAsync('render', () => ejs.renderFile(join(VIEWS, '_content.ejs'), {
      rows: result.rows,
      totalRows: result.total,
      totalPages: result.totalPages,
      page: result.page,
      metrics, categories, statuses,
      sortCol, sortDir, category, status, dateFrom, dateTo,
      columns: COLUMNS, basePath: this._basePath, loadedAt, updatedText: formatUpdated(loadedAt),
    }, { cache: true }));
  }

  async sendContent(res, state) {
    const timer = createTimer();
    sendTimed(res, timer, await this.renderContent(state, timer));
  }

  async sort(req, res) {
    const state = new DashboardState(req.query);
    state.applySortToggle(req.query.col);
    await this.sendContent(res, state);
  }

  async filter(req, res) {
    const state = new DashboardState(req.query);
    if (req.query.categoryInput !== undefined) state.category = req.query.categoryInput;
    if (req.query.statusInput !== undefined) state.status = req.query.statusInput;
    if (req.query.dateFromInput !== undefined) state.dateFrom = req.query.dateFromInput;
    if (req.query.dateToInput !== undefined) state.dateTo = req.query.dateToInput;
    state.page = 1;
    await this.sendContent(res, state);
  }

  async refresh(req, res) {
    await this.sendContent(res, new DashboardState(req.query));
  }

  async paginate(req, res) {
    const state = new DashboardState(req.query);
    state.page = intParam(req.query.p, 'p');
    await this.sendContent(res, state);
  }
}

function refreshTrigger(seconds) {
  const onEvent = `${REFRESH_EVENT} from:body`;
  return seconds > 0 ? `every ${seconds}s, ${onEvent}` : onEvent;
}

const readOnly = new Map();
let activeDb = null;

export async function render(sqlitePath, opts, timer = createTimer()) {
  if (!readOnly.has(sqlitePath)) readOnly.set(sqlitePath, openDashboardDb(sqlitePath));
  activeDb = readOnly.get(sqlitePath);
  const service = new DashboardService(activeDb);
  const { result, categories, statuses, loadedAt } = timer.time('load', () => ({
    result: service.page({ category: 'All', status: 'All', dateFrom: '', dateTo: '', col: '', dir: '', page: 1 }),
    categories: service.categories(),
    statuses: service.statuses(),
    loadedAt: new Date().toISOString(),
  }));
  const refreshSeconds = opts.refreshSeconds ?? DEFAULT_REFRESH_SECONDS;
  const basePath = `/${opts.archetype}/13-htmx-ejs-conventional`;
  return timer.timeAsync('render', () => {
    const metrics = new DashboardMetrics(result);
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
  const basePath = `/${archetype}/13-htmx-ejs-conventional`;
  const controller = new DashboardController(
    { page: (...a) => new DashboardService(activeDb).page(...a), categories: () => new DashboardService(activeDb).categories(), statuses: () => new DashboardService(activeDb).statuses() },
    basePath,
  );

  router.get('/sort', route(async (req, res) => controller.sort(req, res)));
  router.get('/filter', route(async (req, res) => controller.filter(req, res)));
  router.get('/refresh', route(async (req, res) => controller.refresh(req, res)));
  router.get('/page', route(async (req, res) => controller.paginate(req, res)));

  return router;
}
