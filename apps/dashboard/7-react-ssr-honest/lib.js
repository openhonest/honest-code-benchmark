export function compare_string(a, b) {
  const cmp = a.localeCompare(b, undefined, { sensitivity: 'base' });
  return cmp < 0 ? -1 : cmp > 0 ? 1 : 0;
}

export function compare_number(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export const column_types = {
  string: compare_string,
  number: compare_number,
};

const COLUMN_TYPE_MAP = {
  id: 'number',
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
  const type = COLUMN_TYPE_MAP[col];
  const cmp = column_types[type];
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
