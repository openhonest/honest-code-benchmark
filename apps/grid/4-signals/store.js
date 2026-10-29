import { signal, computed } from '@preact/signals-react';

const ROWS_PER_PAGE = 25;

export const data = signal([]);
export const categoryFilter = signal('All');
export const currentPage = signal(1);
export const selectedIds = signal({});
export const editingCell = signal(null);
export const editingValue = signal('');
export const bulkQuarter = signal('q1');
export const bulkValue = signal('');

export const filtered = computed(() => {
  if (categoryFilter.value === 'All') return data.value;
  return data.value.filter(r => r.category === categoryFilter.value);
});

export const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / ROWS_PER_PAGE)));

export const pageRows = computed(() => {
  const start = (currentPage.value - 1) * ROWS_PER_PAGE;
  return filtered.value.slice(start, start + ROWS_PER_PAGE);
});

export const totals = computed(() => {
  const t = { q1: 0, q2: 0, q3: 0, q4: 0, budgetTarget: 0 };
  for (const r of filtered.value) { t.q1 += r.q1; t.q2 += r.q2; t.q3 += r.q3; t.q4 += r.q4; t.budgetTarget += r.budgetTarget; }
  t.total = t.q1 + t.q2 + t.q3 + t.q4;
  t.variance = t.total - t.budgetTarget;
  return t;
});

export function setData(rows) { data.value = rows; currentPage.value = 1; selectedIds.value = {}; }
export function setCatFilter(v) { categoryFilter.value = v; currentPage.value = 1; }
export function setPage(p) { currentPage.value = p; }

export function toggleRow(id) {
  const next = { ...selectedIds.value };
  if (next[id]) delete next[id]; else next[id] = true;
  selectedIds.value = next;
}
export function toggleAllVisible(ids) {
  const sel = selectedIds.value;
  const all = ids.every(id => sel[id]);
  const next = { ...sel };
  if (all) ids.forEach(id => delete next[id]);
  else ids.forEach(id => { next[id] = true; });
  selectedIds.value = next;
}

export function startEdit(id, field, value) {
  editingCell.value = { id, field };
  editingValue.value = String(value);
}
export function setEditVal(v) { editingValue.value = v; }
export function commitEdit() {
  const cell = editingCell.value;
  if (!cell) return;
  const num = parseFloat(editingValue.value);
  if (!isNaN(num)) {
    data.value = data.value.map(r => r.id === cell.id ? { ...r, [cell.field]: num } : r);
  }
  editingCell.value = null;
  editingValue.value = '';
}
export function cancelEditAction() { editingCell.value = null; editingValue.value = ''; }

export function doBulkFill() {
  const num = parseFloat(bulkValue.value);
  if (isNaN(num)) return;
  const q = bulkQuarter.value;
  const sel = selectedIds.value;
  data.value = data.value.map(r => sel[r.id] ? { ...r, [q]: num } : r);
}
