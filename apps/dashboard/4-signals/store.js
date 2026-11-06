import { signal, computed, batch } from '@preact/signals-react';

const ROWS_PER_PAGE = 25;

export const data = signal([]);
export const categoryFilter = signal('All');
export const statusFilter = signal('All');
export const dateFrom = signal('');
export const dateTo = signal('');
export const sortColumn = signal(null);
export const sortDirection = signal(null);
export const currentPage = signal(1);
export const lastUpdated = signal('');

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
  const sign = dir === 'desc' ? -1 : 1;
  return [...filtered.value].sort((a, b) => {
    const av = a[col], bv = b[col];
    let cmp = 0;
    if (typeof av === 'string') {
      const al = av.toLowerCase(), bl = bv.toLowerCase();
      cmp = al < bl ? -1 : al > bl ? 1 : 0;
    } else {
      cmp = av - bv;
    }
    return cmp !== 0 ? sign * cmp : (a.id < b.id ? -1 : 1);
  });
});

export const pageRows = computed(() => {
  const start = (currentPage.value - 1) * ROWS_PER_PAGE;
  return sorted.value.slice(start, start + ROWS_PER_PAGE);
});

export const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / ROWS_PER_PAGE)));

// A load or refresh replaces the rows and the timestamp; filters, sort and
// page stay as the user left them.
export function setData(rows) {
  batch(() => { data.value = rows; lastUpdated.value = new Date().toISOString(); });
}
export function doSort(col) {
  if (sortColumn.value === col) {
    if (sortDirection.value === 'asc') sortDirection.value = 'desc';
    else { sortColumn.value = null; sortDirection.value = null; }
  } else {
    sortColumn.value = col;
    sortDirection.value = 'asc';
  }
}
