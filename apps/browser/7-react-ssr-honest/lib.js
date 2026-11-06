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

export const sort_comparators = {
  string:  compare_string,
  number:  compare_number,
};

const COLUMN_TYPES = {
  name: 'string',
  status: 'string',
  createdDate: 'string',
  value: 'number',
};

export function filter_by_search(rows, text) {
  if (!text) return rows;
  const lower = text.toLowerCase();
  return rows.filter(r => r.name.toLowerCase().includes(lower));
}

export function filter_by_status(rows, status) {
  if (!status || status === 'all') return rows;
  return rows.filter(r => r.status === status);
}

export function sort_rows(rows, col, dir) {
  if (!Object.hasOwn(COLUMN_TYPES, col)) return rows;
  const type = COLUMN_TYPES[col];
  const cmp = sort_comparators[type];
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

export function find_record(rows, id) {
  if (id == null) return undefined;
  return rows.find(r => r.id === id);
}

export function format_value(cents) {
  return `$${Number(cents).toLocaleString('en-US')}`;
}

// Number text without the dollar sign; the tree writes "$" as its own text
// node so the markup matches the shared client exactly.
export function format_value_number(value) {
  return Number(value).toLocaleString('en-US');
}

export function status_label(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Server view: the shared client's first render (no search, all statuses,
// no sort, page 1, nothing selected).
export const ROWS_PER_PAGE = 25;
export const STATUSES = ['active', 'inactive', 'pending', 'archived', 'flagged'];
export const INITIAL_STATE = { search: '', status: 'all', sortCol: null, sortDir: null, currentPage: 1, selectedId: null };
const SORT_INDICATORS = { none: '↕', asc: '↑', desc: '↓' };

export function sort_indicator(state, col) {
  return SORT_INDICATORS[state.sortCol === col ? state.sortDir : 'none'];
}

export function build_view(rows, state = INITIAL_STATE) {
  const visible = sort_rows(filter_by_status(filter_by_search(rows, state.search), state.status), state.sortCol, state.sortDir);
  return {
    state,
    selectedRecord: find_record(rows, state.selectedId),
    ...paginate(visible, state.currentPage, ROWS_PER_PAGE),
  };
}
