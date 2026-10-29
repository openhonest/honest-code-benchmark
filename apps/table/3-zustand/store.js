import { create } from 'zustand';

const ROWS_PER_PAGE = 25;

function filterData(data, text) {
  if (!text) return data;
  const lower = text.toLowerCase();
  return data.filter(r =>
    r.name.toLowerCase().includes(lower) ||
    r.email.toLowerCase().includes(lower) ||
    r.department.toLowerCase().includes(lower)
  );
}

export const useTableStore = create((set, get) => ({
  data: [],
  sortColumn: null,
  sortDirection: null,
  filterText: '',
  currentPage: 1,
  selectedIds: {},
  editingCell: null,
  editingValue: '',

  setData: (rows) => set({ data: rows, currentPage: 1, selectedIds: {} }),

  sort: (col) => set(s => {
    if (s.sortColumn === col) {
      if (s.sortDirection === 'asc') return { sortDirection: 'desc' };
      return { sortColumn: null, sortDirection: null };
    }
    return { sortColumn: col, sortDirection: 'asc' };
  }),

  setFilter: (text) => set({ filterText: text, currentPage: 1 }),
  setPage: (p) => set({ currentPage: p }),

  toggleRow: (id) => set(s => {
    const next = { ...s.selectedIds };
    if (next[id]) delete next[id]; else next[id] = true;
    return { selectedIds: next };
  }),

  toggleAllVisible: (ids) => set(s => {
    const all = ids.every(id => s.selectedIds[id]);
    const next = { ...s.selectedIds };
    if (all) ids.forEach(id => delete next[id]);
    else ids.forEach(id => { next[id] = true; });
    return { selectedIds: next };
  }),

  startEditing: (id, column, value) =>
    set({ editingCell: { id, column }, editingValue: String(value) }),
  setEditingValue: (v) => set({ editingValue: v }),

  commitEdit: () => set(s => {
    if (!s.editingCell) return {};
    const { id, column } = s.editingCell;
    const data = s.data.map(r => {
      if (r.id !== id) return r;
      const val = column === 'salary'
        ? parseInt(s.editingValue, 10) || r[column]
        : s.editingValue;
      return { ...r, [column]: val };
    });
    return { data, editingCell: null, editingValue: '' };
  }),

  cancelEdit: () => set({ editingCell: null, editingValue: '' }),

  deleteSelected: () => set(s => {
    const data = s.data.filter(r => !s.selectedIds[r.id]);
    const filtered = filterData(data, s.filterText);
    const tp = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
    return {
      data,
      selectedIds: {},
      currentPage: s.currentPage > tp ? tp : s.currentPage,
    };
  }),

  getFilteredSorted: () => {
    const s = get();
    let rows = filterData(s.data, s.filterText);
    if (s.sortColumn && s.sortDirection) {
      rows = [...rows].sort((a, b) => {
        const av = a[s.sortColumn], bv = b[s.sortColumn];
        let cmp = 0;
        if (typeof av === 'string') cmp = av.localeCompare(bv);
        else if (typeof av === 'boolean') cmp = av === bv ? 0 : av ? -1 : 1;
        else cmp = av - bv;
        return s.sortDirection === 'desc' ? -cmp : cmp;
      });
    }
    return rows;
  },
}));
