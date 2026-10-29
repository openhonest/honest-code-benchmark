import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'hireDate', label: 'Hire Date' },
  { key: 'salary', label: 'Salary' },
  { key: 'active', label: 'Active' },
];

const ROWS_PER_PAGE = 25;

let domxModule = null;
const stateManifest = {
  sortCol:   { selector: '#table-state', read: 'data:sortCol',   write: 'data:sortCol' },
  sortDir:   { selector: '#table-state', read: 'data:sortDir',   write: 'data:sortDir' },
  filter:    { selector: '#table-state', read: 'data:filter',    write: 'data:filter' },
  page:      { selector: '#table-state', read: 'data:page',      write: 'data:page' },
  selected:  { selector: '#table-state', read: 'data:selected',  write: 'data:selected' },
  editing:   { selector: '#table-state', read: 'data:editing',   write: 'data:editing' },
  editValue: { selector: '#table-state', read: 'data:editValue', write: 'data:editValue' },
};

function writeState(updates) {
  if (domxModule) domxModule.apply(stateManifest, updates);
}

function parseJSON(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function useDomStateSSR(manifest) {
  const [domState, setDomState] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    import('stateless-dataos').then(mod => {
      domxModule = mod;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready || !domxModule) return;
    const collect = () => {
      const state = domxModule.collect(manifest);
      setDomState(state);
    };
    collect();
    const unsub = domxModule.observe(manifest, collect);
    return unsub;
  }, [ready]);

  return { domState, ready };
}

function EditableCell({ row, column, editingCell, editingValue }) {
  const isEditing = editingCell?.id === row.id && editingCell?.column === column;

  const handleDoubleClick = useCallback(() => {
    if (column === 'name' || column === 'salary') {
      writeState({
        editing: JSON.stringify({ id: row.id, column }),
        editValue: String(row[column]),
      });
    }
  }, [row.id, column, row[column]]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      if (editingCell) {
        const target = rowData.find(r => r.id === editingCell.id);
        if (target) {
          target[editingCell.column] = editingCell.column === 'salary'
            ? parseInt(editingValue, 10) || target[editingCell.column]
            : editingValue;
        }
      }
      writeState({ editing: '', editValue: '' });
    } else if (e.key === 'Escape') {
      writeState({ editing: '', editValue: '' });
    }
  }, [editingCell, editingValue]);

  if (isEditing) {
    return (
      <td className="editing" data-column={column}>
        <input
          type="text"
          value={editingValue}
          onChange={e => writeState({ editValue: e.target.value })}
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

let rowData = [];

export default function App({ initialData }) {
  const { domState, ready } = useDomStateSSR(stateManifest);
  const filterTimeout = useRef(null);
  const hydrated = useRef(false);

  if (initialData && !hydrated.current) {
    rowData = initialData;
    hydrated.current = true;
  }

  const sortCol = ready ? (domState.sortCol || null) : null;
  const sortDir = ready ? (domState.sortDir || null) : null;
  const filterText = ready ? (domState.filter || '') : '';
  const currentPage = ready ? (parseInt(domState.page, 10) || 1) : 1;
  const selectedIds = ready ? parseJSON(domState.selected, {}) : {};
  const editingCell = ready ? parseJSON(domState.editing, null) : null;
  const editingValue = ready ? (domState.editValue || '') : '';

  useEffect(() => {
    if (!initialData && typeof window !== 'undefined') {
      const config = window.__BENCHMARK_CONFIG__;
      fetch(config.dataUrl)
        .then(r => r.json())
        .then(data => { rowData = data; });
    }
  }, [initialData]);

  useEffect(() => {
    if (ready && rowData.length > 0) {
      writeState({ page: '1', selected: '{}' });
    }
  }, [ready]);

  const filteredSorted = useMemo(() => {
    let rows = rowData;
    if (filterText) {
      const ft = filterText.toLowerCase();
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(ft) ||
        r.email.toLowerCase().includes(ft) ||
        r.department.toLowerCase().includes(ft)
      );
    }
    if (sortCol && sortDir) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortCol], bv = b[sortCol];
        let cmp = 0;
        if (typeof av === 'string') cmp = av.localeCompare(bv);
        else if (typeof av === 'boolean') cmp = av === bv ? 0 : av ? -1 : 1;
        else cmp = av - bv;
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }
    return rows;
  }, [filterText, sortCol, sortDir, rowData.length]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / ROWS_PER_PAGE));
  const pageRows = filteredSorted.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const handleSort = useCallback((col) => {
    if (sortCol === col) {
      if (sortDir === 'asc') writeState({ sortDir: 'desc' });
      else writeState({ sortCol: '', sortDir: '' });
    } else {
      writeState({ sortCol: col, sortDir: 'asc' });
    }
  }, [sortCol, sortDir]);

  const handleFilter = useCallback((e) => {
    const value = e.target.value;
    clearTimeout(filterTimeout.current);
    filterTimeout.current = setTimeout(() => {
      writeState({ filter: value, page: '1' });
    }, 300);
  }, []);

  const visibleIds = pageRows.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds[id]);
  const selCount = Object.keys(selectedIds).length;

  const handleToggleRow = useCallback((id) => {
    const next = { ...selectedIds };
    if (next[id]) delete next[id]; else next[id] = true;
    writeState({ selected: JSON.stringify(next) });
  }, [selectedIds]);

  const handleToggleAll = useCallback(() => {
    const ids = pageRows.map(r => r.id);
    const all = ids.every(id => selectedIds[id]);
    const next = { ...selectedIds };
    if (all) ids.forEach(id => delete next[id]);
    else ids.forEach(id => { next[id] = true; });
    writeState({ selected: JSON.stringify(next) });
  }, [pageRows, selectedIds]);

  const handleDelete = useCallback(() => {
    rowData = rowData.filter(r => !selectedIds[r.id]);
    const tp = Math.max(1, Math.ceil(rowData.length / ROWS_PER_PAGE));
    writeState({
      selected: '{}',
      page: String(currentPage > tp ? tp : currentPage),
    });
  }, [selectedIds, currentPage]);

  return (
    <div className="app">
      <div id="table-state"
        data-sort-col="" data-sort-dir="" data-filter=""
        data-page="1" data-selected="{}" data-editing="" data-edit-value=""
        style={{ display: 'none' }}
      />

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
                <span className={`sort-indicator${sortCol === col.key ? ' active' : ''}`}>
                  {sortCol !== col.key ? '↕' : sortDir === 'asc' ? '↑' : '↓'}
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
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button
          onClick={() => writeState({ page: String(currentPage - 1) })}
          disabled={currentPage <= 1}
          data-action="prev-page"
        >
          Previous
        </button>
        <span className="page-info" data-role="page-info">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => writeState({ page: String(currentPage + 1) })}
          disabled={currentPage >= totalPages}
          data-action="next-page"
        >
          Next
        </button>
      </div>
    </div>
  );
}
