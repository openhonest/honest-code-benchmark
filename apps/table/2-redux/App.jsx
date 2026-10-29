import React, { useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setData, sort, setFilter, setPage,
  toggleRow, toggleAllVisible,
  startEditing, setEditingValue, commitEdit, cancelEdit,
  deleteSelected,
  selectPageRows, selectTotalPages, selectTotalFiltered,
} from './store.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'hireDate', label: 'Hire Date' },
  { key: 'salary', label: 'Salary' },
  { key: 'active', label: 'Active' },
];

function EditableCell({ row, column, editingCell, editingValue, dispatch }) {
  const isEditing = editingCell?.id === row.id && editingCell?.column === column;

  const handleDoubleClick = useCallback(() => {
    if (column === 'name' || column === 'salary') {
      dispatch(startEditing({ id: row.id, column, value: row[column] }));
    }
  }, [row.id, column, row[column], dispatch]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') dispatch(commitEdit());
    else if (e.key === 'Escape') dispatch(cancelEdit());
  }, [dispatch]);

  if (isEditing) {
    return (
      <td className="editing" data-column={column}>
        <input
          type="text"
          value={editingValue}
          onChange={e => dispatch(setEditingValue(e.target.value))}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </td>
    );
  }

  const value = column === 'salary'
    ? `$${row[column].toLocaleString()}`
    : column === 'active'
      ? (row[column] ? 'Yes' : 'No')
      : String(row[column]);

  return (
    <td
      data-column={column}
      onDoubleClick={handleDoubleClick}
    >
      {value}
    </td>
  );
}

function SortIndicator({ column, sortColumn, sortDirection }) {
  if (sortColumn !== column) return <span className="sort-indicator">↕</span>;
  return (
    <span className="sort-indicator active">
      {sortDirection === 'asc' ? '↑' : '↓'}
    </span>
  );
}

export default function App() {
  const dispatch = useDispatch();
  const rows = useSelector(selectPageRows);
  const totalPages = useSelector(selectTotalPages);
  const totalFiltered = useSelector(selectTotalFiltered);
  const currentPage = useSelector(s => s.table.currentPage);
  const sortColumn = useSelector(s => s.table.sortColumn);
  const sortDirection = useSelector(s => s.table.sortDirection);
  const selectedIds = useSelector(s => s.table.selectedIds);
  const editingCell = useSelector(s => s.table.editingCell);
  const editingValue = useSelector(s => s.table.editingValue);
  const filterText = useSelector(s => s.table.filterText);
  const totalData = useSelector(s => s.table.data.length);

  const filterTimeout = useRef(null);

  useEffect(() => {
    const config = window.__BENCHMARK_CONFIG__;
    fetch(config.dataUrl)
      .then(r => r.json())
      .then(data => dispatch(setData(data)));
  }, [dispatch]);

  const handleFilter = useCallback((e) => {
    const value = e.target.value;
    clearTimeout(filterTimeout.current);
    filterTimeout.current = setTimeout(() => {
      dispatch(setFilter(value));
    }, 300);
  }, [dispatch]);

  const visibleIds = rows.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds[id]);

  return (
    <div className="app">
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Filter by name, email, or department..."
          onChange={handleFilter}
          data-role="filter-input"
        />
      </div>

      <div className="toolbar">
        <span className="selection-count">
          {Object.keys(selectedIds).length} of {totalFiltered} selected
        </span>
        <button
          className="danger"
          onClick={() => dispatch(deleteSelected())}
          disabled={Object.keys(selectedIds).length === 0}
          data-action="delete-selected"
        >
          Delete selected
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={() => dispatch(toggleAllVisible(visibleIds))}
                data-role="select-all"
              />
            </th>
            {COLUMNS.map(col => (
              <th key={col.key} data-column={col.key} onClick={() => dispatch(sort(col.key))}>
                {col.label}
                <SortIndicator column={col.key} sortColumn={sortColumn} sortDirection={sortDirection} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className={selectedIds[row.id] ? 'selected' : ''} data-row={row.id}>
              <td>
                <input
                  type="checkbox"
                  checked={!!selectedIds[row.id]}
                  onChange={() => dispatch(toggleRow(row.id))}
                  data-role="row-checkbox"
                />
              </td>
              {COLUMNS.map(col => (
                <EditableCell
                  key={col.key}
                  row={row}
                  column={col.key}
                  editingCell={editingCell}
                  editingValue={editingValue}
                  dispatch={dispatch}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button
          onClick={() => dispatch(setPage(currentPage - 1))}
          disabled={currentPage <= 1}
          data-action="prev-page"
        >
          Previous
        </button>
        <span className="page-info" data-role="page-info">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => dispatch(setPage(currentPage + 1))}
          disabled={currentPage >= totalPages}
          data-action="next-page"
        >
          Next
        </button>
      </div>
    </div>
  );
}
