import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const ROWS_PER_PAGE = 25;

function fmt(n) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

let domxModule = null;
const stateManifest = {
  categoryFilter: { selector: '#grid-state', read: 'data:categoryFilter', write: 'data:categoryFilter' },
  page:           { selector: '#grid-state', read: 'data:page',           write: 'data:page' },
  selected:       { selector: '#grid-state', read: 'data:selected',       write: 'data:selected' },
  editing:        { selector: '#grid-state', read: 'data:editing',        write: 'data:editing' },
  editValue:      { selector: '#grid-state', read: 'data:editValue',      write: 'data:editValue' },
  bulkQuarter:    { selector: '#grid-state', read: 'data:bulkQuarter',    write: 'data:bulkQuarter' },
  bulkValue:      { selector: '#grid-state', read: 'data:bulkValue',      write: 'data:bulkValue' },
  dataVersion:    { selector: '#grid-state', read: 'data:dataVersion',    write: 'data:dataVersion' },
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

let rowData = [];

function EditableCell({ row, field, editingCell, editingValue }) {
  const isEditing = editingCell?.id === row.id && editingCell?.field === field;
  if (isEditing) {
    return (
      <td className="editing" data-cell={field}>
        <input type="number" step="0.01" value={editingValue}
          onChange={e => writeState({ editValue: e.target.value })}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const num = parseFloat(editingValue);
              if (!isNaN(num)) {
                const target = rowData.find(r => r.id === editingCell.id);
                if (target) target[editingCell.field] = num;
              }
              writeState({ editing: '', editValue: '', dataVersion: String(Date.now()) });
            } else if (e.key === 'Escape') {
              writeState({ editing: '', editValue: '' });
            }
          }}
          autoFocus />
      </td>
    );
  }
  return (
    <td data-cell={field} onClick={() => writeState({ editing: JSON.stringify({ id: row.id, field }), editValue: String(row[field]) })}>
      {fmt(row[field])}
    </td>
  );
}

export default function App({ initialData }) {
  const { domState, ready } = useDomStateSSR(stateManifest);
  const hydrated = useRef(false);

  if (initialData && !hydrated.current) {
    rowData = initialData;
    hydrated.current = true;
  }

  const catFilter = ready ? (domState.categoryFilter || 'All') : 'All';
  const currentPage = ready ? (parseInt(domState.page, 10) || 1) : 1;
  const selectedIds = ready ? parseJSON(domState.selected, {}) : {};
  const editingCell = ready ? parseJSON(domState.editing, null) : null;
  const editingValue = ready ? (domState.editValue || '') : '';
  const bq = ready ? (domState.bulkQuarter || 'q1') : 'q1';
  const bv = ready ? (domState.bulkValue || '') : '';

  useEffect(() => {
    if (!initialData && typeof window !== 'undefined') {
      const config = window.__BENCHMARK_CONFIG__;
      fetch(config.dataUrl).then(r => r.json()).then(data => { rowData = data; });
    }
  }, [initialData]);

  useEffect(() => {
    if (ready && rowData.length > 0) {
      writeState({ page: '1', selected: '{}', dataVersion: '1' });
    }
  }, [ready]);

  const categories = useMemo(() => [...new Set(rowData.map(r => r.category))].sort(), [domState.dataVersion]);

  const filtered = useMemo(() => {
    if (catFilter === 'All') return rowData;
    return rowData.filter(r => r.category === catFilter);
  }, [catFilter, domState.dataVersion]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageRows = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const totals = useMemo(() => {
    const t = { q1: 0, q2: 0, q3: 0, q4: 0, budgetTarget: 0 };
    for (const r of filtered) { t.q1 += r.q1; t.q2 += r.q2; t.q3 += r.q3; t.q4 += r.q4; t.budgetTarget += r.budgetTarget; }
    t.total = t.q1 + t.q2 + t.q3 + t.q4; t.variance = t.total - t.budgetTarget;
    return t;
  }, [filtered]);

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

  const handleBulkFill = useCallback(() => {
    const num = parseFloat(bv);
    if (isNaN(num) || selCount === 0) return;
    for (const r of rowData) {
      if (selectedIds[r.id]) r[bq] = num;
    }
    writeState({ dataVersion: String(Date.now()) });
  }, [bq, bv, selectedIds, selCount]);

  return (
    <div className="app">
      <div id="grid-state"
        data-category-filter="All" data-page="1" data-selected="{}" data-editing="" data-edit-value=""
        data-bulk-quarter="q1" data-bulk-value="" data-data-version="0"
        style={{ display: 'none' }} />

      <div className="toolbar">
        <select value={catFilter} onChange={e => writeState({ categoryFilter: e.target.value, page: '1' })} data-role="category-filter">
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="bulk-fill">
          <select value={bq} onChange={e => writeState({ bulkQuarter: e.target.value })} data-role="bulk-quarter">
            <option value="q1">Q1</option><option value="q2">Q2</option><option value="q3">Q3</option><option value="q4">Q4</option>
          </select>
          <input type="number" step="0.01" placeholder="Value" value={bv}
            onChange={e => writeState({ bulkValue: e.target.value })} data-role="bulk-value" />
          <button onClick={handleBulkFill} disabled={selCount === 0} data-role="bulk-fill">Fill {selCount} rows</button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th><input type="checkbox" checked={allVisibleSelected} onChange={handleToggleAll} data-role="select-all" /></th>
            <th>Category</th><th>Description</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Total</th><th>Budget Target</th><th>Variance</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map(row => {
            const total = row.q1 + row.q2 + row.q3 + row.q4;
            const variance = total - row.budgetTarget;
            return (
              <tr key={row.id} className={selectedIds[row.id] ? 'selected' : ''} data-row={row.id}>
                <td><input type="checkbox" checked={!!selectedIds[row.id]} onChange={() => handleToggleRow(row.id)} data-role="row-checkbox" /></td>
                <td>{row.category}</td><td>{row.description}</td>
                <EditableCell row={row} field="q1" editingCell={editingCell} editingValue={editingValue} />
                <EditableCell row={row} field="q2" editingCell={editingCell} editingValue={editingValue} />
                <EditableCell row={row} field="q3" editingCell={editingCell} editingValue={editingValue} />
                <EditableCell row={row} field="q4" editingCell={editingCell} editingValue={editingValue} />
                <td>{fmt(total)}</td><td>{fmt(row.budgetTarget)}</td>
                <td className={variance < 0 ? 'over-budget' : 'under-budget'} data-role="variance">{fmt(variance)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr data-role="totals-row">
            <td colSpan={3}>Totals</td>
            <td>{fmt(totals.q1)}</td><td>{fmt(totals.q2)}</td><td>{fmt(totals.q3)}</td><td>{fmt(totals.q4)}</td>
            <td>{fmt(totals.total)}</td><td>{fmt(totals.budgetTarget)}</td>
            <td className={totals.variance < 0 ? 'over-budget' : 'under-budget'} data-role="variance">{fmt(totals.variance)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="pagination">
        <button onClick={() => writeState({ page: String(currentPage - 1) })} disabled={currentPage <= 1} data-action="prev-page">Previous</button>
        <span className="page-info" data-role="page-info">Page {currentPage} of {totalPages}</span>
        <button onClick={() => writeState({ page: String(currentPage + 1) })} disabled={currentPage >= totalPages} data-action="next-page">Next</button>
      </div>
    </div>
  );
}
