import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  filter_by_category, paginate,
  compute_row_total, compute_row_variance, compute_totals, format_number,
  commit_cell_edit, bulk_fill, toggle_row, toggle_all_visible,
} from './lib.js';

const ROWS_PER_PAGE = 25;

function EditableCell({ row, field, editingCell, editingValue, onStartEdit, onSetEditValue, onCommit, onCancel }) {
  const isEditing = editingCell?.id === row.id && editingCell?.field === field;
  if (isEditing) {
    return (
      <td className="editing" data-cell={field}>
        <input type="number" step="0.01" value={editingValue}
          onChange={e => onSetEditValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onCommit(); else if (e.key === 'Escape') onCancel(); }}
          autoFocus />
      </td>
    );
  }
  return <td data-cell={field} onClick={() => onStartEdit(row.id, field, row[field])}>{format_number(row[field])}</td>;
}

export default function App({ initialData }) {
  const [data, setData] = useState(initialData || []);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [bulkQuarter, setBulkQuarter] = useState('q1');
  const [bulkValue, setBulkValue] = useState('');

  useEffect(() => {
    if (!initialData && typeof window !== 'undefined') {
      const config = window.__BENCHMARK_CONFIG__;
      fetch(config.dataUrl).then(r => r.json()).then(rows => setData(rows));
    }
  }, [initialData]);

  const categories = useMemo(() => [...new Set(data.map(r => r.category))].sort(), [data]);

  const filtered = useMemo(() => filter_by_category(data, categoryFilter), [data, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const page = useMemo(() => paginate(filtered, currentPage, ROWS_PER_PAGE), [filtered, currentPage]);
  const pageRows = page.pageRows;

  const totals = useMemo(() => compute_totals(filtered), [filtered]);

  const handleStartEdit = useCallback((id, field, value) => {
    setEditingCell({ id, field }); setEditingValue(String(value));
  }, []);

  const handleCommit = useCallback(() => {
    if (!editingCell) return;
    const num = parseFloat(editingValue);
    if (!isNaN(num)) setData(prev => commit_cell_edit(prev, editingCell.id, editingCell.field, num));
    setEditingCell(null); setEditingValue('');
  }, [editingCell, editingValue]);

  const handleCancel = useCallback(() => { setEditingCell(null); setEditingValue(''); }, []);

  const handleToggleRow = useCallback((id) => {
    setSelectedIds(prev => toggle_row(prev, id));
  }, []);

  const visibleIds = pageRows.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds[id]);
  const selCount = Object.keys(selectedIds).length;

  const handleToggleAll = useCallback(() => {
    const ids = pageRows.map(r => r.id);
    setSelectedIds(prev => toggle_all_visible(prev, ids));
  }, [pageRows]);

  const handleBulkFill = useCallback(() => {
    const num = parseFloat(bulkValue);
    if (isNaN(num) || selCount === 0) return;
    setData(prev => bulk_fill(prev, selectedIds, bulkQuarter, num));
  }, [bulkQuarter, bulkValue, selectedIds, selCount]);

  return (
    <div className="app">
      <div className="toolbar">
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }} data-role="category-filter">
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="bulk-fill">
          <select value={bulkQuarter} onChange={e => setBulkQuarter(e.target.value)} data-role="bulk-quarter">
            <option value="q1">Q1</option><option value="q2">Q2</option><option value="q3">Q3</option><option value="q4">Q4</option>
          </select>
          <input type="number" step="0.01" placeholder="Value" value={bulkValue} onChange={e => setBulkValue(e.target.value)} data-role="bulk-value" />
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
            const total = compute_row_total(row);
            const variance = compute_row_variance(row);
            return (
              <tr key={row.id} className={selectedIds[row.id] ? 'selected' : ''} data-row={row.id}>
                <td><input type="checkbox" checked={!!selectedIds[row.id]} onChange={() => handleToggleRow(row.id)} data-role="row-checkbox" /></td>
                <td>{row.category}</td><td>{row.description}</td>
                <EditableCell row={row} field="q1" editingCell={editingCell} editingValue={editingValue} onStartEdit={handleStartEdit} onSetEditValue={setEditingValue} onCommit={handleCommit} onCancel={handleCancel} />
                <EditableCell row={row} field="q2" editingCell={editingCell} editingValue={editingValue} onStartEdit={handleStartEdit} onSetEditValue={setEditingValue} onCommit={handleCommit} onCancel={handleCancel} />
                <EditableCell row={row} field="q3" editingCell={editingCell} editingValue={editingValue} onStartEdit={handleStartEdit} onSetEditValue={setEditingValue} onCommit={handleCommit} onCancel={handleCancel} />
                <EditableCell row={row} field="q4" editingCell={editingCell} editingValue={editingValue} onStartEdit={handleStartEdit} onSetEditValue={setEditingValue} onCommit={handleCommit} onCancel={handleCancel} />
                <td>{format_number(total)}</td><td>{format_number(row.budgetTarget)}</td>
                <td className={variance < 0 ? 'over-budget' : 'under-budget'} data-role="variance">{format_number(variance)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr data-role="totals-row">
            <td colSpan={3}>Totals</td>
            <td>{format_number(totals.q1)}</td><td>{format_number(totals.q2)}</td><td>{format_number(totals.q3)}</td><td>{format_number(totals.q4)}</td>
            <td>{format_number(totals.total)}</td><td>{format_number(totals.budgetTarget)}</td>
            <td className={totals.variance < 0 ? 'over-budget' : 'under-budget'} data-role="variance">{format_number(totals.variance)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="pagination">
        <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage <= 1} data-action="prev-page">Previous</button>
        <span className="page-info" data-role="page-info">Page {currentPage} of {totalPages}</span>
        <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages} data-action="next-page">Next</button>
      </div>
    </div>
  );
}
