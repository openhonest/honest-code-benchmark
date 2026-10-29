import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TableModel } from './domain.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'hireDate', label: 'Hire Date' },
  { key: 'salary', label: 'Salary' },
  { key: 'active', label: 'Active' },
];

function EditableCell({ row, column, model, onUpdate }) {
  const isEditing = model.editingCell?.id === row.id && model.editingCell?.column === column;

  if (isEditing) {
    return (
      <td className="editing" data-column={column}>
        <input
          type="text"
          value={model.editingValue}
          onChange={e => { model.setEditingValue(e.target.value); onUpdate(); }}
          onKeyDown={e => {
            if (e.key === 'Enter') { model.commitEdit(); onUpdate(); }
            else if (e.key === 'Escape') { model.cancelEdit(); onUpdate(); }
          }}
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
      onDoubleClick={() => {
        if (column === 'name' || column === 'salary') {
          model.startEditing(row.id, column);
          onUpdate();
        }
      }}
    >
      {value}
    </td>
  );
}

export default function App({ initialData }) {
  const [model] = useState(() => TableModel.fromData(initialData || []));
  const [, forceUpdate] = useState(0);
  const filterTimeout = useRef(null);

  const update = useCallback(() => forceUpdate(c => c + 1), []);

  useEffect(() => {
    if (!initialData && typeof window !== 'undefined') {
      const config = window.__BENCHMARK_CONFIG__;
      fetch(config.dataUrl)
        .then(r => r.json())
        .then(data => {
          model.rows = data;
          model.currentPage = 1;
          model.selectedIds = {};
          update();
        });
    }
  }, [initialData, model, update]);

  const pageRows = model.getPageRows();
  const totalPages = model.getTotalPages();
  const totalFiltered = model.getTotalFiltered();
  const selCount = model.getSelectedCount();
  const visibleIds = pageRows.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => model.selectedIds[id]);

  return (
    <div className="app">
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Filter by name, email, or department..."
          onChange={e => {
            const value = e.target.value;
            clearTimeout(filterTimeout.current);
            filterTimeout.current = setTimeout(() => { model.setFilter(value); update(); }, 300);
          }}
          data-role="filter-input"
        />
      </div>

      <div className="toolbar">
        <span className="selection-count">
          {selCount} of {totalFiltered} selected
        </span>
        <button
          className="danger"
          onClick={() => { model.deleteSelected(); update(); }}
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
                onChange={() => { model.toggleAllVisible(); update(); }}
                data-role="select-all"
              />
            </th>
            {COLUMNS.map(col => (
              <th key={col.key} data-column={col.key} onClick={() => { model.sort(col.key); update(); }}>
                {col.label}
                <span className={`sort-indicator${model.sortColumn === col.key ? ' active' : ''}`}>
                  {model.sortColumn !== col.key ? '↕' : model.sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map(row => (
            <tr key={row.id} className={model.selectedIds[row.id] ? 'selected' : ''} data-row={row.id}>
              <td>
                <input
                  type="checkbox"
                  checked={!!model.selectedIds[row.id]}
                  onChange={() => { model.toggleRow(row.id); update(); }}
                  data-role="row-checkbox"
                />
              </td>
              {COLUMNS.map(col => (
                <EditableCell key={col.key} row={row} column={col.key} model={model} onUpdate={update} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button
          onClick={() => { model.setPage(model.currentPage - 1); update(); }}
          disabled={model.currentPage <= 1}
          data-action="prev-page"
        >
          Previous
        </button>
        <span className="page-info" data-role="page-info">
          Page {model.currentPage} of {totalPages}
        </span>
        <button
          onClick={() => { model.setPage(model.currentPage + 1); update(); }}
          disabled={model.currentPage >= totalPages}
          data-action="next-page"
        >
          Next
        </button>
      </div>
    </div>
  );
}
