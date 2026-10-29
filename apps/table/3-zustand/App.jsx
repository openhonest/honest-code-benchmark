import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { useTableStore } from './store.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'hireDate', label: 'Hire Date' },
  { key: 'salary', label: 'Salary' },
  { key: 'active', label: 'Active' },
];

const ROWS_PER_PAGE = 25;

function EditableCell({ row, column }) {
  const editingCell = useTableStore(s => s.editingCell);
  const editingValue = useTableStore(s => s.editingValue);
  const startEditing = useTableStore(s => s.startEditing);
  const setEditingValue = useTableStore(s => s.setEditingValue);
  const commitEdit = useTableStore(s => s.commitEdit);
  const cancelEdit = useTableStore(s => s.cancelEdit);

  const isEditing = editingCell?.id === row.id && editingCell?.column === column;

  const handleDoubleClick = useCallback(() => {
    if (column === 'name' || column === 'salary') {
      startEditing(row.id, column, row[column]);
    }
  }, [row.id, column, row[column], startEditing]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') commitEdit();
    else if (e.key === 'Escape') cancelEdit();
  }, [commitEdit, cancelEdit]);

  if (isEditing) {
    return (
      <td className="editing" data-column={column}>
        <input
          type="text"
          value={editingValue}
          onChange={e => setEditingValue(e.target.value)}
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
    <td data-column={column} onDoubleClick={handleDoubleClick}>{value}</td>
  );
}

export default function App() {
  const data = useTableStore(s => s.data);
  const sortColumn = useTableStore(s => s.sortColumn);
  const sortDirection = useTableStore(s => s.sortDirection);
  const filterText = useTableStore(s => s.filterText);
  const currentPage = useTableStore(s => s.currentPage);
  const selectedIds = useTableStore(s => s.selectedIds);
  const setData = useTableStore(s => s.setData);
  const doSort = useTableStore(s => s.sort);
  const setFilter = useTableStore(s => s.setFilter);
  const setPage = useTableStore(s => s.setPage);
  const toggleRow = useTableStore(s => s.toggleRow);
  const toggleAllVisible = useTableStore(s => s.toggleAllVisible);
  const deleteSelected = useTableStore(s => s.deleteSelected);
  const getFilteredSorted = useTableStore(s => s.getFilteredSorted);
  const filterTimeout = useRef(null);

  useEffect(() => {
    const config = window.__BENCHMARK_CONFIG__;
    fetch(config.dataUrl)
      .then(r => r.json())
      .then(rows => setData(rows));
  }, [setData]);

  const filteredSorted = useMemo(() => getFilteredSorted(), [data, filterText, sortColumn, sortDirection]);
  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / ROWS_PER_PAGE));
  const pageRows = filteredSorted.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const handleFilter = useCallback((e) => {
    const value = e.target.value;
    clearTimeout(filterTimeout.current);
    filterTimeout.current = setTimeout(() => setFilter(value), 300);
  }, [setFilter]);

  const visibleIds = pageRows.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds[id]);
  const selCount = Object.keys(selectedIds).length;

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
          {selCount} of {filteredSorted.length} selected
        </span>
        <button
          className="danger"
          onClick={deleteSelected}
          disabled={selCount === 0}
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
                onChange={() => toggleAllVisible(visibleIds)}
                data-role="select-all"
              />
            </th>
            {COLUMNS.map(col => (
              <th key={col.key} data-column={col.key} onClick={() => doSort(col.key)}>
                {col.label}
                <span className={`sort-indicator${sortColumn === col.key ? ' active' : ''}`}>
                  {sortColumn !== col.key ? '↕' : sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map(row => (
            <tr key={row.id} className={selectedIds[row.id] ? 'selected' : ''} data-row={row.id}>
              <td>
                <input
                  type="checkbox"
                  checked={!!selectedIds[row.id]}
                  onChange={() => toggleRow(row.id)}
                  data-role="row-checkbox"
                />
              </td>
              {COLUMNS.map(col => (
                <EditableCell key={col.key} row={row} column={col.key} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button
          onClick={() => setPage(currentPage - 1)}
          disabled={currentPage <= 1}
          data-action="prev-page"
        >
          Previous
        </button>
        <span className="page-info" data-role="page-info">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          data-action="next-page"
        >
          Next
        </button>
      </div>
    </div>
  );
}
