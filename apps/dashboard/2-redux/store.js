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
    lastUpdated: '',
  },
  reducers: {
    // A load or refresh replaces the rows and the timestamp; filters, sort and
    // page stay as the user left them.
    setData(state, action) { state.data = action.payload.rows; state.lastUpdated = action.payload.at; },
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
  const sign = sortDirection === 'desc' ? -1 : 1;
  return [...filtered].sort((a, b) => {
    const av = a[sortColumn], bv = b[sortColumn];
    let cmp = 0;
    if (typeof av === 'string') {
      const al = av.toLowerCase(), bl = bv.toLowerCase();
      cmp = al < bl ? -1 : al > bl ? 1 : 0;
    } else {
      cmp = av - bv;
    }
    return cmp !== 0 ? sign * cmp : (a.id < b.id ? -1 : 1);
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
