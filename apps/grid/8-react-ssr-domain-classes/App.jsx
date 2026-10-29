import React, { useState, useEffect, useCallback } from 'react';
import { GridModel } from './domain.js';

function fmt(n) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function EditableCell({ row, field, model, onUpdate }) {
  const isEditing = model.editingCell?.id === row.id && model.editingCell?.field === field;

  if (isEditing) {
    return (
      <td className="editing" data-cell={field}>
        <input
          type="number"
          step="0.01"
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

  return (
    <td data-cell={field} onClick={() => { model.startEditing(row.id, field); onUpdate(); }}>
      {fmt(row[field])}
    </td>
  );
}

export default function App({ initialData }) {
  const [model] = useState(() => GridModel.fromData(initialData || []));
  const [, forceUpdate] = useState(0);

  const update = useCallback(() => forceUpdate(c => c + 1), []);

  useEffect(() => {
    if (!initialData && typeof window !== 'undefined') {
      const config = window.__BENCHMARK_CONFIG__;
      fetch(config.dataUrl).then(r => r.json()).then(data => { model.rows = data; update(); });
    }
  }, [initialData, model, update]);

  const pageRows = model.getPageRows();
  const totalPages = model.getTotalPages();
  const totals = model.getTotals();
  const selCount = model.getSelectedCount();
  const visibleIds = pageRows.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => model.selectedIds[id]);

  return (
    <div className="app">
      <div className="toolbar">
        <select value={model.categoryFilter} onChange={e => { model.setCategoryFilter(e.target.value); update(); }} data-role="category-filter">
          <option value="All">All Categories</option>
          {model.getCategories().map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="bulk-fill">
          <select value={model.bulkQuarter} onChange={e => { model.setBulkQuarter(e.target.value); update(); }} data-role="bulk-quarter">
            <option value="q1">Q1</option>
            <option value="q2">Q2</option>
            <option value="q3">Q3</option>
            <option value="q4">Q4</option>
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Value"
            value={model.bulkValue}
            onChange={e => { model.setBulkValue(e.target.value); update(); }}
            data-role="bulk-value"
          />
          <button onClick={() => { model.bulkFill(); update(); }} disabled={selCount === 0} data-role="bulk-fill">
            Fill {selCount} rows
          </button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th><input type="checkbox" checked={allVisibleSelected} onChange={() => { model.toggleAllVisible(); update(); }} data-role="select-all" /></th>
            <th>Category</th>
            <th>Description</th>
            <th>Q1</th>
            <th>Q2</th>
            <th>Q3</th>
            <th>Q4</th>
            <th>Total</th>
            <th>Budget Target</th>
            <th>Variance</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map(row => {
            const variance = model.rowVariance(row);
            return (
              <tr key={row.id} className={model.selectedIds[row.id] ? 'selected' : ''} data-row={row.id}>
                <td><input type="checkbox" checked={!!model.selectedIds[row.id]} onChange={() => { model.toggleRow(row.id); update(); }} data-role="row-checkbox" /></td>
                <td>{row.category}</td>
                <td>{row.description}</td>
                <EditableCell row={row} field="q1" model={model} onUpdate={update} />
                <EditableCell row={row} field="q2" model={model} onUpdate={update} />
                <EditableCell row={row} field="q3" model={model} onUpdate={update} />
                <EditableCell row={row} field="q4" model={model} onUpdate={update} />
                <td>{fmt(model.rowTotal(row))}</td>
                <td>{fmt(row.budgetTarget)}</td>
                <td className={variance < 0 ? 'over-budget' : 'under-budget'} data-role="variance">{fmt(variance)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr data-role="totals-row">
            <td colSpan={3}>Totals</td>
            <td>{fmt(totals.q1)}</td>
            <td>{fmt(totals.q2)}</td>
            <td>{fmt(totals.q3)}</td>
            <td>{fmt(totals.q4)}</td>
            <td>{fmt(totals.total)}</td>
            <td>{fmt(totals.budgetTarget)}</td>
            <td className={totals.variance < 0 ? 'over-budget' : 'under-budget'} data-role="variance">{fmt(totals.variance)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="pagination">
        <button onClick={() => { model.setPage(model.currentPage - 1); update(); }} disabled={model.currentPage <= 1} data-action="prev-page">Previous</button>
        <span className="page-info" data-role="page-info">Page {model.currentPage} of {totalPages}</span>
        <button onClick={() => { model.setPage(model.currentPage + 1); update(); }} disabled={model.currentPage >= totalPages} data-action="next-page">Next</button>
      </div>
    </div>
  );
}
