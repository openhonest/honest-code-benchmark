import { configureStore, createSlice } from '@reduxjs/toolkit';

const ROWS_PER_PAGE = 25;

const browserSlice = createSlice({
  name: 'browser',
  initialState: {
    data: [],
    search: '',
    statusFilter: 'all',
    sortColumn: null,
    sortDirection: null,
    currentPage: 1,
    selectedId: null,
  },
  reducers: {
    setData(state, action) {
      state.data = action.payload;
      state.currentPage = 1;
    },
    setSearch(state, action) {
      state.search = action.payload;
      state.currentPage = 1;
    },
    setStatusFilter(state, action) {
      state.statusFilter = action.payload;
      state.currentPage = 1;
    },
    sort(state, action) {
      const col = action.payload;
      if (state.sortColumn === col) {
        if (state.sortDirection === 'asc') state.sortDirection = 'desc';
        else { state.sortColumn = null; state.sortDirection = null; }
      } else {
        state.sortColumn = col;
        state.sortDirection = 'asc';
      }
    },
    setPage(state, action) { state.currentPage = action.payload; },
    setSelectedId(state, action) { state.selectedId = action.payload; },
  },
});

function applyFilters(state) {
  let rows = state.data;
  if (state.search) {
    const s = state.search.toLowerCase();
    rows = rows.filter(r => r.name.toLowerCase().includes(s));
  }
  if (state.statusFilter !== 'all') {
    rows = rows.filter(r => r.status === state.statusFilter);
  }
  if (state.sortColumn && state.sortDirection) {
    rows = [...rows].sort((a, b) => {
      const av = a[state.sortColumn], bv = b[state.sortColumn];
      let cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return state.sortDirection === 'desc' ? -cmp : cmp;
    });
  }
  return rows;
}

export const { setData, setSearch, setStatusFilter, sort, setPage, setSelectedId } = browserSlice.actions;

export function selectFilteredSorted(state) { return applyFilters(state.browser); }
export function selectPageRows(state) {
  const rows = applyFilters(state.browser);
  const start = (state.browser.currentPage - 1) * ROWS_PER_PAGE;
  return rows.slice(start, start + ROWS_PER_PAGE);
}
export function selectTotalPages(state) {
  return Math.max(1, Math.ceil(applyFilters(state.browser).length / ROWS_PER_PAGE));
}

export const store = configureStore({
  reducer: { browser: browserSlice.reducer },
  middleware: (getDefault) => getDefault(),
});
