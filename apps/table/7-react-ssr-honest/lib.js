export function compare_string(a, b) {
  const cmp = a.localeCompare(b, undefined, { sensitivity: 'base' });
  return cmp < 0 ? -1 : cmp > 0 ? 1 : 0;
}

export function compare_number(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function compare_boolean(a, b) {
  const na = a ? 1 : 0;
  const nb = b ? 1 : 0;
  return na < nb ? -1 : na > nb ? 1 : 0;
}

export const sort_comparators = {
  string: compare_string,
  number: compare_number,
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
  const type = COLUMN_TYPES[col];
  const cmp = sort_comparators[type];
  const sorted = rows.slice().sort((a, b) => cmp(a[col], b[col]));
  return dir === 'desc' ? sorted.reverse() : sorted;
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
      ? parseInt(action.value, 10) || r[action.column]
      : action.value;
    return { ...r, [action.column]: val };
  });
}

export function delete_selected(rows, selected) {
  return rows.filter(r => !selected[r.id]);
}
