import { configureStore, createSlice } from '@reduxjs/toolkit';

const ROWS_PER_PAGE = 25;

const gridSlice = createSlice({
  name: 'grid',
  initialState: {
    data: [],
    categoryFilter: 'All',
    currentPage: 1,
    selectedIds: {},
    editingCell: null,
    editingValue: '',
    bulkQuarter: 'q1',
    bulkValue: '',
  },
  reducers: {
    setData(state, action) { state.data = action.payload; state.currentPage = 1; state.selectedIds = {}; },
    setCategoryFilter(state, action) { state.categoryFilter = action.payload; state.currentPage = 1; },
    setPage(state, action) { state.currentPage = action.payload; },
    toggleRow(state, action) {
      const id = action.payload;
      if (state.selectedIds[id]) delete state.selectedIds[id];
      else state.selectedIds[id] = true;
    },
    toggleAllVisible(state, action) {
      const ids = action.payload;
      const all = ids.every(id => state.selectedIds[id]);
      if (all) ids.forEach(id => delete state.selectedIds[id]);
      else ids.forEach(id => { state.selectedIds[id] = true; });
    },
    startEditing(state, action) {
      const { id, field, value } = action.payload;
      state.editingCell = { id, field };
      state.editingValue = String(value);
    },
    setEditingValue(state, action) { state.editingValue = action.payload; },
    commitEdit(state) {
      if (!state.editingCell) return;
      const { id, field } = state.editingCell;
      const num = parseFloat(state.editingValue);
      if (!isNaN(num)) {
        const row = state.data.find(r => r.id === id);
        if (row) row[field] = num;
      }
      state.editingCell = null;
      state.editingValue = '';
    },
    cancelEdit(state) { state.editingCell = null; state.editingValue = ''; },
    setBulkQuarter(state, action) { state.bulkQuarter = action.payload; },
    setBulkValue(state, action) { state.bulkValue = action.payload; },
    bulkFill(state) {
      const num = parseFloat(state.bulkValue);
      if (isNaN(num)) return;
      const q = state.bulkQuarter;
      for (const row of state.data) {
        if (state.selectedIds[row.id]) row[q] = num;
      }
    },
  },
});

export const {
  setData, setCategoryFilter, setPage,
  toggleRow, toggleAllVisible,
  startEditing, setEditingValue, commitEdit, cancelEdit,
  setBulkQuarter, setBulkValue, bulkFill,
} = gridSlice.actions;

export function selectFiltered(state) {
  const { data, categoryFilter } = state.grid;
  if (categoryFilter === 'All') return data;
  return data.filter(r => r.category === categoryFilter);
}

export function selectPageRows(state) {
  const rows = selectFiltered(state);
  const start = (state.grid.currentPage - 1) * ROWS_PER_PAGE;
  return rows.slice(start, start + ROWS_PER_PAGE);
}

export function selectTotalPages(state) {
  return Math.max(1, Math.ceil(selectFiltered(state).length / ROWS_PER_PAGE));
}

export const store = configureStore({
  reducer: { grid: gridSlice.reducer },
  middleware: (getDefault) => getDefault(),
});
