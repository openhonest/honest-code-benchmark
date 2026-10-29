import React, { useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setData, setCategoryFilter, setPage,
  toggleRow, toggleAllVisible,
  startEditing, setEditingValue, commitEdit, cancelEdit,
  setBulkQuarter, setBulkValue, bulkFill,
  selectFiltered, selectPageRows, selectTotalPages,
} from './store.js';

function fmt(n) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function EditableCell({ row, field, editingCell, editingValue, dispatch }) {
  const isEditing = editingCell?.id === row.id && editingCell?.field === field;
  if (isEditing) {
    return (
      <td className="editing" data-cell={field}>
        <input type="number" step="0.01" value={editingValue}
          onChange={e => dispatch(setEditingValue(e.target.value))}
          onKeyDown={e => { if (e.key === 'Enter') dispatch(commitEdit()); else if (e.key === 'Escape') dispatch(cancelEdit()); }}
          autoFocus />
      </td>
    );
  }
  return (
    <td data-cell={field} onClick={() => dispatch(startEditing({ id: row.id, field, value: row[field] }))}>
      {fmt(row[field])}
    </td>
  );
}

export default function App() {
  const dispatch = useDispatch();
  const pageRows = useSelector(selectPageRows);
  const totalPages = useSelector(selectTotalPages);
  const filtered = useSelector(selectFiltered);
  const currentPage = useSelector(s => s.grid.currentPage);
  const selectedIds = useSelector(s => s.grid.selectedIds);
  const editingCell = useSelector(s => s.grid.editingCell);
  const editingValue = useSelector(s => s.grid.editingValue);
  const categoryFilter = useSelector(s => s.grid.categoryFilter);
  const bulkQuarterVal = useSelector(s => s.grid.bulkQuarter);
  const bulkValueVal = useSelector(s => s.grid.bulkValue);
  const data = useSelector(s => s.grid.data);

  const categories = useMemo(() => [...new Set(data.map(r => r.category))].sort(), [data]);

  useEffect(() => {
    const config = window.__BENCHMARK_CONFIG__;
    fetch(config.dataUrl).then(r => r.json()).then(rows => dispatch(setData(rows)));
  }, [dispatch]);

  const totals = useMemo(() => {
    const t = { q1: 0, q2: 0, q3: 0, q4: 0, budgetTarget: 0 };
    for (const r of filtered) { t.q1 += r.q1; t.q2 += r.q2; t.q3 += r.q3; t.q4 += r.q4; t.budgetTarget += r.budgetTarget; }
    t.total = t.q1 + t.q2 + t.q3 + t.q4;
    t.variance = t.total - t.budgetTarget;
    return t;
  }, [filtered]);

  const visibleIds = pageRows.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds[id]);
  const selCount = Object.keys(selectedIds).length;

  return (
    <div className="app">
      <div className="toolbar">
        <select value={categoryFilter} onChange={e => dispatch(setCategoryFilter(e.target.value))} data-role="category-filter">
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="bulk-fill">
          <select value={bulkQuarterVal} onChange={e => dispatch(setBulkQuarter(e.target.value))} data-role="bulk-quarter">
            <option value="q1">Q1</option><option value="q2">Q2</option><option value="q3">Q3</option><option value="q4">Q4</option>
          </select>
          <input type="number" step="0.01" placeholder="Value" value={bulkValueVal}
            onChange={e => dispatch(setBulkValue(e.target.value))} data-role="bulk-value" />
          <button onClick={() => dispatch(bulkFill())} disabled={selCount === 0} data-role="bulk-fill">Fill {selCount} rows</button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th><input type="checkbox" checked={allVisibleSelected} onChange={() => dispatch(toggleAllVisible(visibleIds))} data-role="select-all" /></th>
            <th>Category</th><th>Description</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Total</th><th>Budget Target</th><th>Variance</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map(row => {
            const total = row.q1 + row.q2 + row.q3 + row.q4;
            const variance = total - row.budgetTarget;
            return (
              <tr key={row.id} className={selectedIds[row.id] ? 'selected' : ''} data-row={row.id}>
                <td><input type="checkbox" checked={!!selectedIds[row.id]} onChange={() => dispatch(toggleRow(row.id))} data-role="row-checkbox" /></td>
                <td>{row.category}</td><td>{row.description}</td>
                <EditableCell row={row} field="q1" editingCell={editingCell} editingValue={editingValue} dispatch={dispatch} />
                <EditableCell row={row} field="q2" editingCell={editingCell} editingValue={editingValue} dispatch={dispatch} />
                <EditableCell row={row} field="q3" editingCell={editingCell} editingValue={editingValue} dispatch={dispatch} />
                <EditableCell row={row} field="q4" editingCell={editingCell} editingValue={editingValue} dispatch={dispatch} />
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
        <button onClick={() => dispatch(setPage(currentPage - 1))} disabled={currentPage <= 1} data-action="prev-page">Previous</button>
        <span className="page-info" data-role="page-info">Page {currentPage} of {totalPages}</span>
        <button onClick={() => dispatch(setPage(currentPage + 1))} disabled={currentPage >= totalPages} data-action="next-page">Next</button>
      </div>
    </div>
  );
}
