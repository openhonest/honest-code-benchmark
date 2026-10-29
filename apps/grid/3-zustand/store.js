import { create } from 'zustand';

const ROWS_PER_PAGE = 25;

export const useGridStore = create((set, get) => ({
  data: [],
  categoryFilter: 'All',
  currentPage: 1,
  selectedIds: {},
  editingCell: null,
  editingValue: '',
  bulkQuarter: 'q1',
  bulkValue: '',

  setData: (rows) => set({ data: rows, currentPage: 1, selectedIds: {} }),
  setCategoryFilter: (v) => set({ categoryFilter: v, currentPage: 1 }),
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

  startEditing: (id, field, value) => set({ editingCell: { id, field }, editingValue: String(value) }),
  setEditingValue: (v) => set({ editingValue: v }),
  commitEdit: () => set(s => {
    if (!s.editingCell) return {};
    const { id, field } = s.editingCell;
    const num = parseFloat(s.editingValue);
    if (isNaN(num)) return { editingCell: null, editingValue: '' };
    return {
      data: s.data.map(r => r.id === id ? { ...r, [field]: num } : r),
      editingCell: null, editingValue: '',
    };
  }),
  cancelEdit: () => set({ editingCell: null, editingValue: '' }),

  setBulkQuarter: (v) => set({ bulkQuarter: v }),
  setBulkValue: (v) => set({ bulkValue: v }),
  bulkFill: () => set(s => {
    const num = parseFloat(s.bulkValue);
    if (isNaN(num)) return {};
    const q = s.bulkQuarter;
    return { data: s.data.map(r => s.selectedIds[r.id] ? { ...r, [q]: num } : r) };
  }),

  getFiltered: () => {
    const s = get();
    if (s.categoryFilter === 'All') return s.data;
    return s.data.filter(r => r.category === s.categoryFilter);
  },
}));
