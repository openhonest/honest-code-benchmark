import { parseSalary } from '../../lib/value-rules.js';

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

export function compare_boolean(a, b) {
  return a === b ? 0 : a ? -1 : 1;
}

export const sort_comparators = {
  string:  compare_string,
  number:  compare_number,
  boolean: compare_boolean,
};

const COLUMN_TYPES = {
  name: 'string',
  email: 'string',
  department: 'string',
  hireDate: 'string',
  salary: 'number',
  active: 'boolean',
};

export function filter_rows(rows, text) {
  if (!text) return rows;
  const lower = text.toLowerCase();
  return rows.filter(r =>
    r.name.toLowerCase().includes(lower) ||
    r.email.toLowerCase().includes(lower) ||
    r.department.toLowerCase().includes(lower)
  );
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

export function format_cell(column, value) {
  if (column === 'salary') return `$${Number(value).toLocaleString('en-US')}`;
  if (column === 'active') return value ? 'Yes' : 'No';
  return String(value);
}

export function toggle_row(selected, id) {
  const next = { ...selected };
  if (next[id]) delete next[id]; else next[id] = true;
  return next;
}

export function toggle_all_visible(selected, ids) {
  const allIn = ids.every(id => selected[id]);
  const next = { ...selected };
  if (allIn) ids.forEach(id => delete next[id]);
  else ids.forEach(id => { next[id] = true; });
  return next;
}

export function commit_edit(rows, action) {
  return rows.map(r => {
    if (r.id !== action.id) return r;
    const val = action.column === 'salary'
      ? (parseSalary(action.value) ?? r[action.column])
      : action.value;
    return { ...r, [action.column]: val };
  });
}

export function delete_selected(rows, selected) {
  return rows.filter(r => !selected[r.id]);
}

// Server view: the first render the shared client produces for the same rows
// (no sort, no filter, page 1, nothing selected).
export const ROWS_PER_PAGE = 25;
export const INITIAL_STATE = { sortCol: null, sortDir: null, filterText: '', currentPage: 1, selected: {} };
const SORT_INDICATORS = { none: '↕', asc: '↑', desc: '↓' };

export function sort_indicator(state, col) {
  return SORT_INDICATORS[state.sortCol === col ? state.sortDir : 'none'];
}

export function build_view(rows, state = INITIAL_STATE) {
  const visible = sort_rows(filter_rows(rows, state.filterText), state.sortCol, state.sortDir);
  const page = paginate(visible, state.currentPage, ROWS_PER_PAGE);
  const visibleIds = page.pageRows.map(r => r.id);
  return {
    ...page,
    state,
    currentPage: state.currentPage,
    selCount: Object.keys(state.selected).length,
    allVisibleSelected: visibleIds.length > 0 && visibleIds.every(id => state.selected[id]),
  };
}
