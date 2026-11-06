import React from 'react';
import { ROWS_PER_PAGE } from './domain.js';

function fmt(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function ServerApp({ lines }) {
  const categories = [...new Set(lines.map(r => r.category))].sort();
  const totalPages = Math.max(1, Math.ceil(lines.length / ROWS_PER_PAGE));
  const currentPage = 1;
  const pageRows = lines.slice(0, ROWS_PER_PAGE);
  const selCount = 0;

  const totals = { q1: 0, q2: 0, q3: 0, q4: 0, budgetTarget: 0 };
  for (const r of lines) {
    totals.q1 += r.q1; totals.q2 += r.q2; totals.q3 += r.q3; totals.q4 += r.q4;
    totals.budgetTarget += r.budgetTarget;
  }
  totals.total = totals.q1 + totals.q2 + totals.q3 + totals.q4;
  totals.variance = totals.total - totals.budgetTarget;

  return (
    <div className="app">
      <div className="toolbar">
        <select value="All" onChange={() => {}} data-role="category-filter">
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="bulk-fill">
          <select value="q1" onChange={() => {}} data-role="bulk-quarter">
            <option value="q1">Q1</option>
            <option value="q2">Q2</option>
            <option value="q3">Q3</option>
            <option value="q4">Q4</option>
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Value"
            value=""
            onChange={() => {}}
            data-role="bulk-value"
          />
          <button disabled={selCount === 0} data-role="bulk-fill">
            Fill {selCount} rows
          </button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th><input type="checkbox" checked={false} onChange={() => {}} data-role="select-all" /></th>
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
            const total = row.q1 + row.q2 + row.q3 + row.q4;
            const variance = total - row.budgetTarget;
            return (
              <tr key={row.id} className="" data-row={row.id}>
                <td><input type="checkbox" checked={false} onChange={() => {}} data-role="row-checkbox" /></td>
                <td>{row.category}</td>
                <td>{row.description}</td>
                <td data-cell="q1">{fmt(row.q1)}</td>
                <td data-cell="q2">{fmt(row.q2)}</td>
                <td data-cell="q3">{fmt(row.q3)}</td>
                <td data-cell="q4">{fmt(row.q4)}</td>
                <td>{fmt(total)}</td>
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
        <button disabled={currentPage <= 1} data-action="prev-page">Previous</button>
        <span className="page-info" data-role="page-info">Page {currentPage} of {totalPages}</span>
        <button disabled={currentPage >= totalPages} data-action="next-page">Next</button>
      </div>
    </div>
  );
}
