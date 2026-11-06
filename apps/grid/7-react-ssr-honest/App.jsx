// Arm 7 server tree. Plain function components, no hooks: the view comes from
// build_view() in lib.js. The browser hydrates it with ../shared-client/App.jsx.
import React from 'react';
import { QUARTERS, compute_row_total, compute_row_variance, format_number, variance_class } from './lib.js';

const noop = () => {};

function Row({ row, selected }) {
  const variance = compute_row_variance(row);
  return (
    <tr className={selected ? 'selected' : ''} data-row={row.id}>
      <td><input type="checkbox" checked={selected} onChange={noop} data-role="row-checkbox" /></td>
      <td>{row.category}</td>
      <td>{row.description}</td>
      {QUARTERS.map(q => <td key={q} data-cell={q}>{format_number(row[q])}</td>)}
      <td>{format_number(compute_row_total(row))}</td>
      <td>{format_number(row.budgetTarget)}</td>
      <td className={variance_class(variance)} data-role="variance">{format_number(variance)}</td>
    </tr>
  );
}

export default function App({ view }) {
  const { state, categories, pageRows, totalPages, totals, selCount, allVisibleSelected } = view;
  const currentPage = state.currentPage;
  return (
    <div className="app">
      <div className="toolbar">
        <select value={state.category} onChange={noop} data-role="category-filter">
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="bulk-fill">
          <select value={state.bulkQuarter} onChange={noop} data-role="bulk-quarter">
            {QUARTERS.map(q => <option key={q} value={q}>{q.toUpperCase()}</option>)}
          </select>
          <input type="number" step="0.01" placeholder="Value" value={state.bulkValue} onChange={noop} data-role="bulk-value" />
          <button disabled={selCount === 0} data-role="bulk-fill">
            Fill {selCount} rows
          </button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th><input type="checkbox" checked={allVisibleSelected} onChange={noop} data-role="select-all" /></th>
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
          {pageRows.map(row => <Row key={row.id} row={row} selected={!!state.selected[row.id]} />)}
        </tbody>
        <tfoot>
          <tr data-role="totals-row">
            <td colSpan={3}>Totals</td>
            {QUARTERS.map(q => <td key={q}>{format_number(totals[q])}</td>)}
            <td>{format_number(totals.total)}</td>
            <td>{format_number(totals.budgetTarget)}</td>
            <td className={variance_class(totals.variance)} data-role="variance">{format_number(totals.variance)}</td>
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
