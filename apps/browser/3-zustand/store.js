import { create } from 'zustand';

const ROWS_PER_PAGE = 25;

export const useBrowserStore = create((set, get) => ({
  data: [],
  search: '',
  statusFilter: 'all',
  sortColumn: null,
  sortDirection: null,
  currentPage: 1,
  selectedId: null,

  setData: (rows) => set({ data: rows, currentPage: 1 }),
  setSearch: (text) => set({ search: text, currentPage: 1 }),
  setStatusFilter: (status) => set({ statusFilter: status, currentPage: 1 }),
  sort: (col) => set(s => {
    if (s.sortColumn === col) {
      if (s.sortDirection === 'asc') return { sortDirection: 'desc' };
      return { sortColumn: null, sortDirection: null };
    }
    return { sortColumn: col, sortDirection: 'asc' };
  }),
  setPage: (p) => set({ currentPage: p }),
  setSelectedId: (id) => set({ selectedId: id }),

  getFilteredSorted: () => {
    const s = get();
    let rows = s.data;
    if (s.search) {
      const q = s.search.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(q));
    }
    if (s.statusFilter !== 'all') {
      rows = rows.filter(r => r.status === s.statusFilter);
    }
    if (s.sortColumn && s.sortDirection) {
      rows = [...rows].sort((a, b) => {
        const av = a[s.sortColumn], bv = b[s.sortColumn];
        let cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
        return s.sortDirection === 'desc' ? -cmp : cmp;
      });
    }
    return rows;
  },
}));
