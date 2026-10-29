import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

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
  const [data, setData] = useState([]);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const filterTimeout = useRef(null);

  useEffect(() => {
    const config = window.__BENCHMARK_CONFIG__;
    fetch(config.dataUrl)
      .then(r => r.json())
      .then(rows => { setData(rows); setCurrentPage(1); setSelectedIds({}); });
  }, []);

  const filteredSorted = useMemo(() => {
    let rows = data;
    if (filterText) {
      const ft = filterText.toLowerCase();
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(ft) ||
        r.email.toLowerCase().includes(ft) ||
        r.department.toLowerCase().includes(ft)
      );
    }
    if (sortColumn && sortDirection) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortColumn], bv = b[sortColumn];
        let cmp = 0;
        if (typeof av === 'string') cmp = av.localeCompare(bv);
        else if (typeof av === 'boolean') cmp = av === bv ? 0 : av ? -1 : 1;
        else cmp = av - bv;
        return sortDirection === 'desc' ? -cmp : cmp;
      });
    }
    return rows;
  }, [data, filterText, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / ROWS_PER_PAGE));
  const pageRows = filteredSorted.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

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
    setSelectedIds(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id]; else next[id] = true;
      return next;
    });
  }, []);

  const visibleIds = pageRows.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds[id]);
  const selCount = Object.keys(selectedIds).length;

  const handleToggleAll = useCallback(() => {
    const ids = pageRows.map(r => r.id);
    setSelectedIds(prev => {
      const all = ids.every(id => prev[id]);
      const next = { ...prev };
      if (all) ids.forEach(id => delete next[id]);
      else ids.forEach(id => { next[id] = true; });
      return next;
    });
  }, [pageRows]);

  const handleDelete = useCallback(() => {
    setData(prev => prev.filter(r => !selectedIds[r.id]));
    setSelectedIds({});
  }, [selectedIds]);

  const handleStartEdit = useCallback((id, column, value) => {
    setEditingCell({ id, column });
    setEditingValue(String(value));
  }, []);

  const handleCommit = useCallback(() => {
    if (!editingCell) return;
    const { id, column } = editingCell;
    setData(prev => prev.map(r => {
      if (r.id !== id) return r;
      const val = column === 'salary'
        ? parseInt(editingValue, 10) || r[column]
        : editingValue;
      return { ...r, [column]: val };
    }));
    setEditingCell(null);
    setEditingValue('');
  }, [editingCell, editingValue]);

  const handleCancel = useCallback(() => {
    setEditingCell(null);
    setEditingValue('');
  }, []);

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
          {pageRows.map(row => (
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
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(p => p + 1)}
          disabled={currentPage >= totalPages}
          data-action="next-page"
        >
          Next
        </button>
      </div>
    </div>
  );
}
