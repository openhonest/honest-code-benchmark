import React, { useState, useEffect, useCallback, useMemo } from 'react';

const ROWS_PER_PAGE = 25;

function fmt(n) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

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
  return <td data-cell={field} onClick={() => onStartEdit(row.id, field, row[field])}>{fmt(row[field])}</td>;
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

  const filtered = useMemo(() => {
    if (categoryFilter === 'All') return data;
    return data.filter(r => r.category === categoryFilter);
  }, [data, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageRows = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const totals = useMemo(() => {
    const t = { q1: 0, q2: 0, q3: 0, q4: 0, budgetTarget: 0 };
    for (const r of filtered) { t.q1 += r.q1; t.q2 += r.q2; t.q3 += r.q3; t.q4 += r.q4; t.budgetTarget += r.budgetTarget; }
    t.total = t.q1 + t.q2 + t.q3 + t.q4; t.variance = t.total - t.budgetTarget;
    return t;
  }, [filtered]);

  const handleStartEdit = useCallback((id, field, value) => {
    setEditingCell({ id, field }); setEditingValue(String(value));
  }, []);
  const handleCommit = useCallback(() => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const num = parseFloat(editingValue);
    if (!isNaN(num)) setData(prev => prev.map(r => r.id === id ? { ...r, [field]: num } : r));
    setEditingCell(null); setEditingValue('');
  }, [editingCell, editingValue]);
  const handleCancel = useCallback(() => { setEditingCell(null); setEditingValue(''); }, []);

  const handleToggleRow = useCallback((id) => {
    setSelectedIds(prev => { const next = { ...prev }; if (next[id]) delete next[id]; else next[id] = true; return next; });
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

  const handleBulkFill = useCallback(() => {
    const num = parseFloat(bulkValue);
    if (isNaN(num) || selCount === 0) return;
    setData(prev => prev.map(r => selectedIds[r.id] ? { ...r, [bulkQuarter]: num } : r));
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
            const total = row.q1 + row.q2 + row.q3 + row.q4;
            const variance = total - row.budgetTarget;
            return (
              <tr key={row.id} className={selectedIds[row.id] ? 'selected' : ''} data-row={row.id}>
                <td><input type="checkbox" checked={!!selectedIds[row.id]} onChange={() => handleToggleRow(row.id)} data-role="row-checkbox" /></td>
                <td>{row.category}</td><td>{row.description}</td>
                <EditableCell row={row} field="q1" editingCell={editingCell} editingValue={editingValue} onStartEdit={handleStartEdit} onSetEditValue={setEditingValue} onCommit={handleCommit} onCancel={handleCancel} />
                <EditableCell row={row} field="q2" editingCell={editingCell} editingValue={editingValue} onStartEdit={handleStartEdit} onSetEditValue={setEditingValue} onCommit={handleCommit} onCancel={handleCancel} />
                <EditableCell row={row} field="q3" editingCell={editingCell} editingValue={editingValue} onStartEdit={handleStartEdit} onSetEditValue={setEditingValue} onCommit={handleCommit} onCancel={handleCancel} />
                <EditableCell row={row} field="q4" editingCell={editingCell} editingValue={editingValue} onStartEdit={handleStartEdit} onSetEditValue={setEditingValue} onCommit={handleCommit} onCancel={handleCancel} />
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
        <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage <= 1} data-action="prev-page">Previous</button>
        <span className="page-info" data-role="page-info">Page {currentPage} of {totalPages}</span>
        <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages} data-action="next-page">Next</button>
      </div>
    </div>
  );
}
