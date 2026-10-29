import { signal, computed } from '@preact/signals-react';

const ROWS_PER_PAGE = 25;

export const data = signal([]);
export const search = signal('');
export const statusFilter = signal('all');
export const sortColumn = signal(null);
export const sortDirection = signal(null);
export const currentPage = signal(1);
export const selectedId = signal(null);

export const filteredSorted = computed(() => {
  let rows = data.value;
  if (search.value) {
    const s = search.value.toLowerCase();
    rows = rows.filter(r => r.name.toLowerCase().includes(s));
  }
  if (statusFilter.value !== 'all') {
    rows = rows.filter(r => r.status === statusFilter.value);
  }
  const col = sortColumn.value;
  const dir = sortDirection.value;
  if (col && dir) {
    rows = [...rows].sort((a, b) => {
      const av = a[col], bv = b[col];
      let cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return dir === 'desc' ? -cmp : cmp;
    });
  }
  return rows;
});

export const pageRows = computed(() => {
  const start = (currentPage.value - 1) * ROWS_PER_PAGE;
  return filteredSorted.value.slice(start, start + ROWS_PER_PAGE);
});

export const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredSorted.value.length / ROWS_PER_PAGE))
);

export function setData(rows) { data.value = rows; currentPage.value = 1; }
export function doSetSearch(text) { search.value = text; currentPage.value = 1; }
export function doSetStatusFilter(status) { statusFilter.value = status; currentPage.value = 1; }
export function doSort(col) {
  if (sortColumn.value === col) {
    if (sortDirection.value === 'asc') sortDirection.value = 'desc';
    else { sortColumn.value = null; sortDirection.value = null; }
  } else {
    sortColumn.value = col;
    sortDirection.value = 'asc';
  }
}
export function setPage(p) { currentPage.value = p; }
export function doSetSelectedId(id) { selectedId.value = id; }
