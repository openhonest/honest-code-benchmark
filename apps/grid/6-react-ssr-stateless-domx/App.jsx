import React, { useState, useEffect, useCallback } from 'react';
import { useServerPage, postJSON } from '../../lib/arm6-client.js';


function fmt(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

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

function EditableCell({ row, field, editingCell, editingValue }) {
  const isEditing = editingCell?.id === row.id && editingCell?.field === field;
  if (isEditing) {
    return (
      <td className="editing" data-cell={field}>
        <input type="number" step="0.01" value={editingValue}
          onChange={e => writeState({ editValue: e.target.value })}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              // The server applies the money rule and answers 400 on bad input.
              postJSON('cell', { id: editingCell.id, field: editingCell.field, value: editingValue })
                .finally(() => writeState({ editing: '', editValue: '', dataVersion: String(Date.now()) }));
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

const INITIAL_QUERY = { category: 'All', page: '1', v: '0' };

export default function App({ initialPage }) {
  const { domState, ready } = useDomStateSSR(stateManifest);

  const catFilter = ready ? (domState.categoryFilter || 'All') : 'All';
  const requestedPage = ready ? (parseInt(domState.page, 10) || 1) : 1;
  const selectedIds = ready ? parseJSON(domState.selected, {}) : {};
  const editingCell = ready ? parseJSON(domState.editing, null) : null;
  const editingValue = ready ? (domState.editValue || '') : '';
  const bq = ready ? (domState.bulkQuarter || 'q1') : 'q1';
  const bv = ready ? (domState.bulkValue || '') : '';
  const version = ready ? (domState.dataVersion || '0') : '0';

  const pageData = useServerPage(initialPage, { category: catFilter, page: String(requestedPage), v: version }, INITIAL_QUERY);

  useEffect(() => {
    if (ready) writeState({ page: '1', selected: '{}' });
  }, [ready]);

  const { categories, totals, rows: pageRows, page: currentPage, totalPages } = pageData;

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
    if (selCount === 0) return;
    const ids = Object.keys(selectedIds).map(Number);
    postJSON('bulk', { ids, field: bq, value: bv })
      .finally(() => writeState({ dataVersion: String(Date.now()) }));
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
