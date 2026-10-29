import { configureStore, createSlice } from '@reduxjs/toolkit';

const ROWS_PER_PAGE = 25;

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    data: [],
    categoryFilter: 'All',
    statusFilter: 'All',
    dateFrom: '',
    dateTo: '',
    sortColumn: null,
    sortDirection: null,
    currentPage: 1,
  },
  reducers: {
    setData(state, action) { state.data = action.payload; state.currentPage = 1; },
    setCategoryFilter(state, action) { state.categoryFilter = action.payload; state.currentPage = 1; },
    setStatusFilter(state, action) { state.statusFilter = action.payload; state.currentPage = 1; },
    setDateFrom(state, action) { state.dateFrom = action.payload; state.currentPage = 1; },
    setDateTo(state, action) { state.dateTo = action.payload; state.currentPage = 1; },
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
  },
});

function filterRows(state) {
  let rows = state.data;
  if (state.categoryFilter !== 'All') rows = rows.filter(r => r.category === state.categoryFilter);
  if (state.statusFilter !== 'All') rows = rows.filter(r => r.status === state.statusFilter);
  if (state.dateFrom) rows = rows.filter(r => r.date >= state.dateFrom);
  if (state.dateTo) rows = rows.filter(r => r.date <= state.dateTo);
  return rows;
}

export function selectFiltered(state) { return filterRows(state.dashboard); }

export function selectSorted(state) {
  const filtered = filterRows(state.dashboard);
  const { sortColumn, sortDirection } = state.dashboard;
  if (!sortColumn || !sortDirection) return filtered;
  return [...filtered].sort((a, b) => {
    const av = a[sortColumn], bv = b[sortColumn];
    let cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return sortDirection === 'desc' ? -cmp : cmp;
  });
}

export function selectPageRows(state) {
  const sorted = selectSorted(state);
  const start = (state.dashboard.currentPage - 1) * ROWS_PER_PAGE;
  return sorted.slice(start, start + ROWS_PER_PAGE);
}

export function selectTotalPages(state) {
  return Math.max(1, Math.ceil(selectSorted(state).length / ROWS_PER_PAGE));
}

export const {
  setData, setCategoryFilter, setStatusFilter, setDateFrom, setDateTo, sort, setPage,
} = dashboardSlice.actions;

export const store = configureStore({ reducer: { dashboard: dashboardSlice.reducer } });
