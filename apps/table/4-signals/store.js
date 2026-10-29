import { signal, computed } from '@preact/signals-react';

const ROWS_PER_PAGE = 25;

export const data = signal([]);
export const sortColumn = signal(null);
export const sortDirection = signal(null);
export const filterText = signal('');
export const currentPage = signal(1);
export const selectedIds = signal({});
export const editingCell = signal(null);
export const editingValue = signal('');

export const filteredSorted = computed(() => {
  let rows = data.value;
  const ft = filterText.value.toLowerCase();
  if (ft) {
    rows = rows.filter(r =>
      r.name.toLowerCase().includes(ft) ||
      r.email.toLowerCase().includes(ft) ||
      r.department.toLowerCase().includes(ft)
    );
  }
  const col = sortColumn.value;
  const dir = sortDirection.value;
  if (col && dir) {
    rows = [...rows].sort((a, b) => {
      const av = a[col], bv = b[col];
      let cmp = 0;
      if (typeof av === 'string') cmp = av.localeCompare(bv);
      else if (typeof av === 'boolean') cmp = av === bv ? 0 : av ? -1 : 1;
      else cmp = av - bv;
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

export const totalFiltered = computed(() => filteredSorted.value.length);

export function setData(rows) { data.value = rows; currentPage.value = 1; selectedIds.value = {}; }
export function doSort(col) {
  if (sortColumn.value === col) {
    if (sortDirection.value === 'asc') sortDirection.value = 'desc';
    else { sortColumn.value = null; sortDirection.value = null; }
  } else {
    sortColumn.value = col;
    sortDirection.value = 'asc';
  }
}
export function setFilter(text) { filterText.value = text; currentPage.value = 1; }
export function setPage(p) { currentPage.value = p; }
export function toggleRow(id) {
  const next = { ...selectedIds.value };
  if (next[id]) delete next[id]; else next[id] = true;
  selectedIds.value = next;
}
export function toggleAllVisible(ids) {
  const sel = selectedIds.value;
  const allSelected = ids.every(id => sel[id]);
  const next = { ...sel };
  if (allSelected) ids.forEach(id => delete next[id]);
  else ids.forEach(id => { next[id] = true; });
  selectedIds.value = next;
}
export function startEditing(id, column, value) {
  editingCell.value = { id, column };
  editingValue.value = String(value);
}
export function setEditValue(v) { editingValue.value = v; }
export function commitEdit() {
  const cell = editingCell.value;
  if (!cell) return;
  const row = data.value.find(r => r.id === cell.id);
  if (row) {
    row[cell.column] = cell.column === 'salary'
      ? parseInt(editingValue.value, 10) || row[cell.column]
      : editingValue.value;
    data.value = [...data.value];
  }
  editingCell.value = null;
  editingValue.value = '';
}
export function cancelEdit() { editingCell.value = null; editingValue.value = ''; }
export function deleteSelected() {
  data.value = data.value.filter(r => !selectedIds.value[r.id]);
  selectedIds.value = {};
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value;
}
