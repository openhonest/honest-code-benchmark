import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  filter_rows, sort_rows, paginate, format_cell,
  toggle_row, toggle_all_visible, commit_edit, delete_selected,
} from './lib.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'hireDate', label: 'Hire Date' },
  { key: 'salary', label: 'Salary' },
  { key: 'active', label: 'Active' },
];

const ROWS_PER_PAGE = 25;

function EditableCell({ row, column, editingCell, editingValue, onStartEdit, onSetEditValue, onCommit, onCancel }) {
  const isEditing = editingCell?.id === row.id && editingCell?.column === column;

  const handleDoubleClick = useCallback(() => {
    if (column === 'name' || column === 'salary') {
      onStartEdit(row.id, column, row[column]);
    }
  }, [row.id, column, row[column], onStartEdit]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') onCommit();
    else if (e.key === 'Escape') onCancel();
  }, [onCommit, onCancel]);

  if (isEditing) {
    return (
      <td className="editing" data-column={column}>
        <input
          type="text"
          value={editingValue}
          onChange={e => onSetEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </td>
    );
  }

  return (
    <td data-column={column} onDoubleClick={handleDoubleClick}>
      {format_cell(column, row[column])}
    </td>
  );
}

export default function App({ initialData }) {
  const [data, setData] = useState(initialData || []);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const filterTimeout = useRef(null);

  const filtered = useMemo(() => filter_rows(data, filterText), [data, filterText]);

  const filteredSorted = useMemo(() => {
    if (!sortColumn || !sortDirection) return filtered;
    return sort_rows(filtered, sortColumn, sortDirection);
  }, [filtered, sortColumn, sortDirection]);

  const page = useMemo(
    () => paginate(filteredSorted, currentPage, ROWS_PER_PAGE),
    [filteredSorted, currentPage],
  );

  const handleSort = useCallback((col) => {
    setSortColumn(prev => {
      if (prev === col) {
        setSortDirection(d => {
          if (d === 'asc') return 'desc';
          setSortColumn(null);
          return null;
        });
        return prev;
      }
      setSortDirection('asc');
      return col;
    });
  }, []);

  const handleFilter = useCallback((e) => {
    const value = e.target.value;
    clearTimeout(filterTimeout.current);
    filterTimeout.current = setTimeout(() => {
      setFilterText(value);
      setCurrentPage(1);
    }, 300);
  }, []);

  const handleToggleRow = useCallback((id) => {
    setSelectedIds(prev => toggle_row(prev, id));
  }, []);

  const handleToggleAll = useCallback(() => {
    const ids = page.pageRows.map(r => r.id);
    setSelectedIds(prev => toggle_all_visible(prev, ids));
  }, [page.pageRows]);

  const handleDelete = useCallback(() => {
    setData(prev => delete_selected(prev, selectedIds));
    setSelectedIds({});
  }, [selectedIds]);

  const handleStartEdit = useCallback((id, column, value) => {
    setEditingCell({ id, column });
    setEditingValue(String(value));
  }, []);

  const handleCommit = useCallback(() => {
    if (!editingCell) return;
    setData(prev => commit_edit(prev, { id: editingCell.id, column: editingCell.column, value: editingValue }));
    setEditingCell(null);
    setEditingValue('');
  }, [editingCell, editingValue]);

  const handleCancel = useCallback(() => {
    setEditingCell(null);
    setEditingValue('');
  }, []);

  const visibleIds = page.pageRows.map(r => r.id);
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
          onClick={handleDelete}
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
                onChange={handleToggleAll}
                data-role="select-all"
              />
            </th>
            {COLUMNS.map(col => (
              <th key={col.key} data-column={col.key} onClick={() => handleSort(col.key)}>
                {col.label}
                <span className={`sort-indicator${sortColumn === col.key ? ' active' : ''}`}>
                  {sortColumn !== col.key ? '↕' : sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {page.pageRows.map(row => (
            <tr key={row.id} className={selectedIds[row.id] ? 'selected' : ''} data-row={row.id}>
              <td>
                <input
                  type="checkbox"
                  checked={!!selectedIds[row.id]}
                  onChange={() => handleToggleRow(row.id)}
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
                  onStartEdit={handleStartEdit}
                  onSetEditValue={setEditingValue}
                  onCommit={handleCommit}
                  onCancel={handleCancel}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button
          onClick={() => setCurrentPage(p => p - 1)}
          disabled={currentPage <= 1}
          data-action="prev-page"
        >
          Previous
        </button>
        <span className="page-info" data-role="page-info">
          Page {currentPage} of {page.totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(p => p + 1)}
          disabled={currentPage >= page.totalPages}
          data-action="next-page"
        >
          Next
        </button>
      </div>
    </div>
  );
}
