import React, { useEffect, useCallback, useRef } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  pageRows, totalPages, totalFiltered,
  currentPage, sortColumn, sortDirection, selectedIds,
  editingCell, editingValue, filterText, data,
  setData, doSort, setFilter, setPage,
  toggleRow, toggleAllVisible,
  startEditing, setEditValue, commitEdit, cancelEdit,
  deleteSelected,
} from './store.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'hireDate', label: 'Hire Date' },
  { key: 'salary', label: 'Salary' },
  { key: 'active', label: 'Active' },
];

function EditableCell({ row, column }) {
  useSignals();
  const cell = editingCell.value;
  const isEditing = cell?.id === row.id && cell?.column === column;

  const handleDoubleClick = useCallback(() => {
    if (column === 'name' || column === 'salary') {
      startEditing(row.id, column, row[column]);
    }
  }, [row.id, column, row[column]]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') commitEdit();
    else if (e.key === 'Escape') cancelEdit();
  }, []);

  if (isEditing) {
    return (
      <td className="editing" data-column={column}>
        <input
          type="text"
          value={editingValue.value}
          onChange={e => setEditValue(e.target.value)}
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

function SortIndicator({ column }) {
  useSignals();
  if (sortColumn.value !== column) return <span className="sort-indicator">{'↕'}</span>;
  return (
    <span className="sort-indicator active">
      {sortDirection.value === 'asc' ? '↑' : '↓'}
    </span>
  );
}

export default function App() {
  useSignals();
  const filterTimeout = useRef(null);

  useEffect(() => {
    const config = window.__BENCHMARK_CONFIG__;
    fetch(config.dataUrl)
      .then(r => r.json())
      .then(rows => setData(rows));
  }, []);

  const handleFilter = useCallback((e) => {
    const value = e.target.value;
    clearTimeout(filterTimeout.current);
    filterTimeout.current = setTimeout(() => setFilter(value), 300);
  }, []);

  const rows = pageRows.value;
  const sel = selectedIds.value;
  const visibleIds = rows.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => sel[id]);
  const selCount = Object.keys(sel).length;

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
          {selCount} of {totalFiltered.value} selected
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
                <SortIndicator column={col.key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className={sel[row.id] ? 'selected' : ''} data-row={row.id}>
              <td>
                <input
                  type="checkbox"
                  checked={!!sel[row.id]}
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
          onClick={() => setPage(currentPage.value - 1)}
          disabled={currentPage.value <= 1}
          data-action="prev-page"
        >
          Previous
        </button>
        <span className="page-info" data-role="page-info">
          Page {currentPage.value} of {totalPages.value}
        </span>
        <button
          onClick={() => setPage(currentPage.value + 1)}
          disabled={currentPage.value >= totalPages.value}
          data-action="next-page"
        >
          Next
        </button>
      </div>
    </div>
  );
}
