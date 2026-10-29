export function compare_string(a, b) {
  const cmp = a.localeCompare(b, undefined, { sensitivity: 'base' });
  return cmp < 0 ? -1 : cmp > 0 ? 1 : 0;
}

export function compare_number(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export const sort_comparators = {
  string: compare_string,
  number: compare_number,
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

export function find_record(rows, id) {
  if (id == null) return undefined;
  return rows.find(r => r.id === id);
}

export function format_value(cents) {
  return `$${Number(cents).toLocaleString('en-US')}`;
}
