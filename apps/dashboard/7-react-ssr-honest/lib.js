// Sort rule shared by every arm: ASCII lower-case string comparison (the same
// order as SQLite NOCASE), numeric comparison, booleans true first on ascending,
// ties broken by ascending id in both directions.
export function compare_string(a, b) {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  return al < bl ? -1 : al > bl ? 1 : 0;
}

export function compare_number(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export const column_types = {
  string:  compare_string,
  number:  compare_number,
};

const COLUMN_TYPE_MAP = {
  id: 'string',
  date: 'string',
  customerName: 'string',
  category: 'string',
  amount: 'number',
  status: 'string',
  items: 'number',
};

export function filter_by_category(rows, category) {
  if (category === 'All') return rows;
  return rows.filter(r => r.category === category);
}

export function filter_by_status(rows, status) {
  if (status === 'All') return rows;
  return rows.filter(r => r.status === status);
}

export function filter_by_date_range(rows, from, to) {
  let result = rows;
  if (from) result = result.filter(r => r.date >= from);
  if (to) result = result.filter(r => r.date <= to);
  return result;
}

export function sort_rows(rows, col, dir) {
  if (!Object.hasOwn(COLUMN_TYPE_MAP, col)) return rows;
  const type = COLUMN_TYPE_MAP[col];
  const cmp = column_types[type];
  const sign = dir === 'desc' ? -1 : 1;
  return rows.slice().sort((a, b) => sign * cmp(a[col], b[col]) || (a.id < b.id ? -1 : 1));
}

export function paginate(rows, page, perPage) {
  const start = (page - 1) * perPage;
  return {
    pageRows: rows.slice(start, start + perPage),
    totalPages: Math.ceil(rows.length / perPage) || 1,
    totalFiltered: rows.length,
  };
}

export function compute_kpis(rows) {
  const totalOrders = rows.length;
  const totalRevenue = rows.reduce((sum, r) => sum + r.amount, 0);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const uniqueCustomers = new Set(rows.map(r => r.customerName)).size;
  return { totalOrders, totalRevenue, avgOrder, uniqueCustomers };
}

export function format_currency(value) {
  return '$' + Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Number text without the dollar sign. The tree writes "$" as its own text
// node so the markup matches the shared client exactly.
export function format_amount(value) {
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// "2026-10-30T19:03:12.345Z" -> "19:03:12 UTC"; empty input gives "".
export function format_updated(iso) {
  return iso ? `${iso.slice(11, 19)} UTC` : '';
}

export function distinct_sorted(rows, key) {
  return [...new Set(rows.map(r => r[key]))].sort();
}

// Server view: the shared client's first render (all categories, all
// statuses, no dates, no sort, page 1).
export const ROWS_PER_PAGE = 25;
export const INITIAL_STATE = { category: 'All', status: 'All', dateFrom: '', dateTo: '', sortCol: null, sortDir: null, currentPage: 1 };
const SORT_INDICATORS = { none: '↕', asc: '↑', desc: '↓' };

export function sort_indicator(state, col) {
  return SORT_INDICATORS[state.sortCol === col ? state.sortDir : 'none'];
}

export function build_view(rows, state = INITIAL_STATE) {
  const filtered = filter_by_date_range(filter_by_status(filter_by_category(rows, state.category), state.status), state.dateFrom, state.dateTo);
  const sorted = sort_rows(filtered, state.sortCol, state.sortDir);
  return {
    state,
    kpis: compute_kpis(filtered),
    categories: distinct_sorted(rows, 'category'),
    statuses: distinct_sorted(rows, 'status'),
    ...paginate(sorted, state.currentPage, ROWS_PER_PAGE),
  };
}
