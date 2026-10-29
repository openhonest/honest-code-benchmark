import { signal, computed } from '@preact/signals-react';

const ROWS_PER_PAGE = 25;

export const data = signal([]);
export const categoryFilter = signal('All');
export const statusFilter = signal('All');
export const dateFrom = signal('');
export const dateTo = signal('');
export const sortColumn = signal(null);
export const sortDirection = signal(null);
export const currentPage = signal(1);

export const filtered = computed(() => {
  let rows = data.value;
  if (categoryFilter.value !== 'All') rows = rows.filter(r => r.category === categoryFilter.value);
  if (statusFilter.value !== 'All') rows = rows.filter(r => r.status === statusFilter.value);
  if (dateFrom.value) rows = rows.filter(r => r.date >= dateFrom.value);
  if (dateTo.value) rows = rows.filter(r => r.date <= dateTo.value);
  return rows;
});

export const sorted = computed(() => {
  const col = sortColumn.value, dir = sortDirection.value;
  if (!col || !dir) return filtered.value;
  return [...filtered.value].sort((a, b) => {
    const av = a[col], bv = b[col];
    let cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return dir === 'desc' ? -cmp : cmp;
  });
});

export const pageRows = computed(() => {
  const start = (currentPage.value - 1) * ROWS_PER_PAGE;
  return sorted.value.slice(start, start + ROWS_PER_PAGE);
});

export const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / ROWS_PER_PAGE)));

export function setData(rows) { data.value = rows; currentPage.value = 1; }
export function doSort(col) {
  if (sortColumn.value === col) {
    if (sortDirection.value === 'asc') sortDirection.value = 'desc';
    else { sortColumn.value = null; sortDirection.value = null; }
  } else {
    sortColumn.value = col;
    sortDirection.value = 'asc';
  }
}
