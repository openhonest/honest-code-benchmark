import React, { useEffect, useMemo } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  data, categoryFilter, currentPage, selectedIds,
  editingCell, editingValue, bulkQuarter, bulkValue,
  filtered, totalPages, pageRows, totals,
  setData, setCatFilter, setPage,
  toggleRow, toggleAllVisible,
  startEdit, setEditVal, commitEdit, cancelEditAction,
  doBulkFill,
} from './store.js';

function fmt(n) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function EditableCell({ row, field }) {
  useSignals();
  const cell = editingCell.value;
  const isEditing = cell?.id === row.id && cell?.field === field;
  if (isEditing) {
    return (
      <td className="editing" data-cell={field}>
        <input type="number" step="0.01" value={editingValue.value}
          onChange={e => setEditVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); else if (e.key === 'Escape') cancelEditAction(); }}
          autoFocus />
      </td>
    );
  }
  return <td data-cell={field} onClick={() => startEdit(row.id, field, row[field])}>{fmt(row[field])}</td>;
}

export default function App() {
  useSignals();

  useEffect(() => {
    const config = window.__BENCHMARK_CONFIG__;
    fetch(config.dataUrl).then(r => r.json()).then(rows => setData(rows));
  }, []);

  const categories = useMemo(() => [...new Set(data.value.map(r => r.category))].sort(), [data.value]);
  const rows = pageRows.value;
  const sel = selectedIds.value;
  const visibleIds = rows.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => sel[id]);
  const selCount = Object.keys(sel).length;
  const t = totals.value;

  return (
    <div className="app">
      <div className="toolbar">
        <select value={categoryFilter.value} onChange={e => setCatFilter(e.target.value)} data-role="category-filter">
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="bulk-fill">
          <select value={bulkQuarter.value} onChange={e => { bulkQuarter.value = e.target.value; }} data-role="bulk-quarter">
            <option value="q1">Q1</option><option value="q2">Q2</option><option value="q3">Q3</option><option value="q4">Q4</option>
          </select>
          <input type="number" step="0.01" placeholder="Value" value={bulkValue.value} onChange={e => { bulkValue.value = e.target.value; }} data-role="bulk-value" />
          <button onClick={doBulkFill} disabled={selCount === 0} data-role="bulk-fill">Fill {selCount} rows</button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th><input type="checkbox" checked={allVisibleSelected} onChange={() => toggleAllVisible(visibleIds)} data-role="select-all" /></th>
            <th>Category</th><th>Description</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Total</th><th>Budget Target</th><th>Variance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const total = row.q1 + row.q2 + row.q3 + row.q4;
            const variance = total - row.budgetTarget;
            return (
              <tr key={row.id} className={sel[row.id] ? 'selected' : ''} data-row={row.id}>
                <td><input type="checkbox" checked={!!sel[row.id]} onChange={() => toggleRow(row.id)} data-role="row-checkbox" /></td>
                <td>{row.category}</td><td>{row.description}</td>
                <EditableCell row={row} field="q1" /><EditableCell row={row} field="q2" />
                <EditableCell row={row} field="q3" /><EditableCell row={row} field="q4" />
                <td>{fmt(total)}</td><td>{fmt(row.budgetTarget)}</td>
                <td className={variance < 0 ? 'over-budget' : 'under-budget'} data-role="variance">{fmt(variance)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr data-role="totals-row">
            <td colSpan={3}>Totals</td>
            <td>{fmt(t.q1)}</td><td>{fmt(t.q2)}</td><td>{fmt(t.q3)}</td><td>{fmt(t.q4)}</td>
            <td>{fmt(t.total)}</td><td>{fmt(t.budgetTarget)}</td>
            <td className={t.variance < 0 ? 'over-budget' : 'under-budget'} data-role="variance">{fmt(t.variance)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="pagination">
        <button onClick={() => setPage(currentPage.value - 1)} disabled={currentPage.value <= 1} data-action="prev-page">Previous</button>
        <span className="page-info" data-role="page-info">Page {currentPage.value} of {totalPages.value}</span>
        <button onClick={() => setPage(currentPage.value + 1)} disabled={currentPage.value >= totalPages.value} data-action="next-page">Next</button>
      </div>
    </div>
  );
}
