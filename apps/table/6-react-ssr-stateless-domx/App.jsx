import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useServerPage, postJSON } from '../../lib/arm6-client.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'hireDate', label: 'Hire Date' },
  { key: 'salary', label: 'Salary' },
  { key: 'active', label: 'Active' },
];

let domxModule = null;
const stateManifest = {
  sortCol:   { selector: '#table-state', read: 'data:sortCol',   write: 'data:sortCol' },
  sortDir:   { selector: '#table-state', read: 'data:sortDir',   write: 'data:sortDir' },
  filter:    { selector: '#table-state', read: 'data:filter',    write: 'data:filter' },
  page:      { selector: '#table-state', read: 'data:page',      write: 'data:page' },
  selected:  { selector: '#table-state', read: 'data:selected',  write: 'data:selected' },
  editing:   { selector: '#table-state', read: 'data:editing',   write: 'data:editing' },
  editValue: { selector: '#table-state', read: 'data:editValue', write: 'data:editValue' },
  version:   { selector: '#table-state', read: 'data:version',   write: 'data:version' },
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
      if (!editingCell) return;
      // The server applies the salary rule and answers 400 on bad input;
      // either way the edit closes and the page reloads from SQLite.
      postJSON('edit', { id: editingCell.id, column: editingCell.column, value: editingValue })
        .finally(() => writeState({ editing: '', editValue: '', version: String(Date.now()) }));
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
    ? `$${row[column].toLocaleString('en-US')}`
    : column === 'active'
      ? (row[column] ? 'Yes' : 'No')
      : String(row[column]);

  return (
    <td data-column={column} onDoubleClick={handleDoubleClick}>{value}</td>
  );
}

const INITIAL_QUERY = { q: '', col: '', dir: '', page: '1', v: '' };

export default function App({ initialPage }) {
  const { domState, ready } = useDomStateSSR(stateManifest);
  const filterTimeout = useRef(null);

  const sortCol = ready ? (domState.sortCol || null) : null;
  const sortDir = ready ? (domState.sortDir || null) : null;
  const filterText = ready ? (domState.filter || '') : '';
  const requestedPage = ready ? (parseInt(domState.page, 10) || 1) : 1;
  const selectedIds = ready ? parseJSON(domState.selected, {}) : {};
  const editingCell = ready ? parseJSON(domState.editing, null) : null;
  const editingValue = ready ? (domState.editValue || '') : '';
  const version = ready ? (domState.version || '') : '';

  const pageData = useServerPage(initialPage, {
    q: filterText, col: sortCol || '', dir: sortDir || '', page: String(requestedPage), v: version,
  }, INITIAL_QUERY);

  useEffect(() => {
    if (ready) writeState({ page: '1', selected: '{}' });
  }, [ready]);

  const pageRows = pageData.rows;
  const currentPage = pageData.page;
  const totalPages = pageData.totalPages;

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
    const ids = Object.keys(selectedIds).map(Number);
    // The server clamps the page when the delete removes the last one.
    postJSON('delete', { ids })
      .finally(() => writeState({ selected: '{}', version: String(Date.now()) }));
  }, [selectedIds]);

  return (
    <div className="app">
      <div id="table-state"
        data-sort-col="" data-sort-dir="" data-filter=""
        data-page="1" data-selected="{}" data-editing="" data-edit-value="" data-version=""
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
          {selCount} of {pageData.total} selected
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
