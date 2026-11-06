import { configureStore, createSlice } from '@reduxjs/toolkit';
import { parseSalary } from '../../lib/value-rules.js';

const ROWS_PER_PAGE = 25;

const tableSlice = createSlice({
  name: 'table',
  initialState: {
    data: [],
    sortColumn: null,
    sortDirection: null,
    filterText: '',
    currentPage: 1,
    selectedIds: {},
    editingCell: null,
    editingValue: '',
  },
  reducers: {
    setData(state, action) {
      state.data = action.payload;
      state.currentPage = 1;
      state.selectedIds = {};
    },

    sort(state, action) {
      const col = action.payload;
      if (state.sortColumn === col) {
        if (state.sortDirection === 'asc') {
          state.sortDirection = 'desc';
        } else if (state.sortDirection === 'desc') {
          state.sortColumn = null;
          state.sortDirection = null;
        }
      } else {
        state.sortColumn = col;
        state.sortDirection = 'asc';
      }
    },

    setFilter(state, action) {
      state.filterText = action.payload;
      state.currentPage = 1;
    },

    setPage(state, action) {
      state.currentPage = action.payload;
    },

    toggleRow(state, action) {
      const id = action.payload;
      if (state.selectedIds[id]) delete state.selectedIds[id];
      else state.selectedIds[id] = true;
    },

    toggleAllVisible(state, action) {
      const visibleIds = action.payload;
      const allSelected = visibleIds.every(id => state.selectedIds[id]);
      if (allSelected) {
        visibleIds.forEach(id => delete state.selectedIds[id]);
      } else {
        visibleIds.forEach(id => { state.selectedIds[id] = true; });
      }
    },

    startEditing(state, action) {
      const { id, column, value } = action.payload;
      state.editingCell = { id, column };
      state.editingValue = String(value);
    },

    setEditingValue(state, action) {
      state.editingValue = action.payload;
    },

    commitEdit(state) {
      if (!state.editingCell) return;
      const { id, column } = state.editingCell;
      const row = state.data.find(r => r.id === id);
      if (row) {
        row[column] = column === 'salary'
          ? (parseSalary(state.editingValue) ?? row[column])
          : state.editingValue;
      }
      state.editingCell = null;
      state.editingValue = '';
    },

    cancelEdit(state) {
      state.editingCell = null;
      state.editingValue = '';
    },

    deleteSelected(state) {
      state.data = state.data.filter(r => !state.selectedIds[r.id]);
      state.selectedIds = {};
      const totalPages = Math.max(1, Math.ceil(
        filterData(state.data, state.filterText).length / ROWS_PER_PAGE
      ));
      if (state.currentPage > totalPages) state.currentPage = totalPages;
    },
  },
});

function filterData(data, text) {
  if (!text) return data;
  const lower = text.toLowerCase();
  return data.filter(r =>
    r.name.toLowerCase().includes(lower) ||
    r.email.toLowerCase().includes(lower) ||
    r.department.toLowerCase().includes(lower)
  );
}

export const {
  setData, sort, setFilter, setPage,
  toggleRow, toggleAllVisible,
  startEditing, setEditingValue, commitEdit, cancelEdit,
  deleteSelected,
} = tableSlice.actions;

export function selectFilteredSorted(state) {
  let rows = filterData(state.table.data, state.table.filterText);

  const { sortColumn, sortDirection } = state.table;
  if (sortColumn && sortDirection) {
    const sign = sortDirection === 'desc' ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const av = a[sortColumn];
      const bv = b[sortColumn];
      let cmp = 0;
      if (typeof av === 'string') {
        const al = av.toLowerCase(), bl = bv.toLowerCase();
        cmp = al < bl ? -1 : al > bl ? 1 : 0;
      } else if (typeof av === 'boolean') {
        cmp = av === bv ? 0 : av ? -1 : 1;
      } else {
        cmp = av - bv;
      }
      return cmp !== 0 ? sign * cmp : (a.id < b.id ? -1 : 1);
    });
  }

  return rows;
}

export function selectPageRows(state) {
  const rows = selectFilteredSorted(state);
  const start = (state.table.currentPage - 1) * ROWS_PER_PAGE;
  return rows.slice(start, start + ROWS_PER_PAGE);
}

export function selectTotalPages(state) {
  return Math.max(1, Math.ceil(selectFilteredSorted(state).length / ROWS_PER_PAGE));
}

export function selectTotalFiltered(state) {
  return selectFilteredSorted(state).length;
}

export const store = configureStore({
  reducer: { table: tableSlice.reducer },
  middleware: (getDefault) => getDefault(),
});
