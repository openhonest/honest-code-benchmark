import { create } from 'zustand';

const ROWS_PER_PAGE = 25;

export const useDashboardStore = create((set, get) => ({
  data: [],
  categoryFilter: 'All',
  statusFilter: 'All',
  dateFrom: '',
  dateTo: '',
  sortColumn: null,
  sortDirection: null,
  currentPage: 1,
  lastUpdated: '',

  // A load or refresh replaces the rows and the timestamp; filters, sort
  // and page stay as the user left them.
  setData: (rows) => set({ data: rows, lastUpdated: new Date().toISOString() }),
  setCategoryFilter: (v) => set({ categoryFilter: v, currentPage: 1 }),
  setStatusFilter: (v) => set({ statusFilter: v, currentPage: 1 }),
  setDateFrom: (v) => set({ dateFrom: v, currentPage: 1 }),
  setDateTo: (v) => set({ dateTo: v, currentPage: 1 }),
  sort: (col) => set(s => {
    if (s.sortColumn === col) {
      if (s.sortDirection === 'asc') return { sortDirection: 'desc' };
      return { sortColumn: null, sortDirection: null };
    }
    return { sortColumn: col, sortDirection: 'asc' };
  }),
  setPage: (p) => set({ currentPage: p }),

  getFiltered: () => {
    const s = get();
    let rows = s.data;
    if (s.categoryFilter !== 'All') rows = rows.filter(r => r.category === s.categoryFilter);
    if (s.statusFilter !== 'All') rows = rows.filter(r => r.status === s.statusFilter);
    if (s.dateFrom) rows = rows.filter(r => r.date >= s.dateFrom);
    if (s.dateTo) rows = rows.filter(r => r.date <= s.dateTo);
    return rows;
  },

  getSorted: () => {
    const s = get();
    const filtered = get().getFiltered();
    if (!s.sortColumn || !s.sortDirection) return filtered;
    const sign = s.sortDirection === 'desc' ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const av = a[s.sortColumn], bv = b[s.sortColumn];
      let cmp = 0;
      if (typeof av === 'string') {
        const al = av.toLowerCase(), bl = bv.toLowerCase();
        cmp = al < bl ? -1 : al > bl ? 1 : 0;
      } else {
        cmp = av - bv;
      }
      return cmp !== 0 ? sign * cmp : (a.id < b.id ? -1 : 1);
    });
  },
}));
