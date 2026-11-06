// Arm 9 server tree, written the conventional way: context providers, custom
// hooks, a domain model, switch rendering and wrapper components. The browser
// hydrates it with ../shared-client/App.jsx, so the markup must match that
// client's first render.
import React, { useMemo } from 'react';
import { ThemeProvider, ErrorBoundary, Layout, DataLoader, createStore, useFormatters } from './patterns.jsx';
import { QUARTERS } from './models.js';

const INITIAL_FILTERS = { category: 'All', currentPage: 1, selected: {}, bulkQuarter: 'q1', bulkValue: '' };
const noop = () => {};

const [DataProvider, useBudget] = createStore('BudgetData');
const [FilterProvider, useFilters] = createStore('BudgetFilters');

function useGridView() {
  const budget = useBudget();
  const filters = useFilters();
  return useMemo(() => budget.view(filters), [budget, filters]);
}

function useSelection(pageRows) {
  const { selected } = useFilters();
  return useMemo(() => ({
    isSelected: id => !!selected[id],
    count: Object.keys(selected).length,
    allVisible: pageRows.length > 0 && pageRows.every(r => selected[r.id]),
  }), [selected, pageRows]);
}

function VarianceCell({ value }) {
  const fmt = useFormatters();
  return <td className={value < 0 ? 'over-budget' : 'under-budget'} data-role="variance">{fmt.money(value)}</td>;
}

function Toolbar({ selection }) {
  const budget = useBudget();
  const { category, bulkQuarter, bulkValue } = useFilters();
  return (
    <div className="toolbar">
      <select value={category} onChange={noop} data-role="category-filter">
        <option value="All">All Categories</option>
        {budget.categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <div className="bulk-fill">
        <select value={bulkQuarter} onChange={noop} data-role="bulk-quarter">
          {QUARTERS.map(q => <option key={q} value={q}>{q.toUpperCase()}</option>)}
        </select>
        <input type="number" step="0.01" placeholder="Value" value={bulkValue} onChange={noop} data-role="bulk-value" />
        <button disabled={selection.count === 0} data-role="bulk-fill">
          Fill {selection.count} rows
        </button>
      </div>
    </div>
  );
}

function BudgetRow({ line, selected }) {
  const fmt = useFormatters();
  return (
    <tr className={selected ? 'selected' : ''} data-row={line.id}>
      <td><input type="checkbox" checked={selected} onChange={noop} data-role="row-checkbox" /></td>
      <td>{line.category}</td>
      <td>{line.description}</td>
      {QUARTERS.map(q => <td key={q} data-cell={q}>{fmt.money(line[q])}</td>)}
      <td>{fmt.money(line.total)}</td>
      <td>{fmt.money(line.budgetTarget)}</td>
      <VarianceCell value={line.variance} />
    </tr>
  );
}

function TotalsRow({ totals }) {
  const fmt = useFormatters();
  return (
    <tr data-role="totals-row">
      <td colSpan={3}>Totals</td>
      {QUARTERS.map(q => <td key={q}>{fmt.money(totals[q])}</td>)}
      <td>{fmt.money(totals.total)}</td>
      <td>{fmt.money(totals.budgetTarget)}</td>
      <VarianceCell value={totals.variance} />
    </tr>
  );
}

function Pagination({ totalPages }) {
  const { currentPage } = useFilters();
  return (
    <div className="pagination">
      <button disabled={currentPage <= 1} data-action="prev-page">Previous</button>
      <span className="page-info" data-role="page-info">Page {currentPage} of {totalPages}</span>
      <button disabled={currentPage >= totalPages} data-action="next-page">Next</button>
    </div>
  );
}

function BudgetGrid() {
  const { pageRows, totalPages, totals } = useGridView();
  const selection = useSelection(pageRows);
  return (
    <>
      <Toolbar selection={selection} />
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" checked={selection.allVisible} onChange={noop} data-role="select-all" /></th>
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
          {pageRows.map(l => <BudgetRow key={l.id} line={l} selected={selection.isSelected(l.id)} />)}
        </tbody>
        <tfoot>
          <TotalsRow totals={totals} />
        </tfoot>
      </table>
      <Pagination totalPages={totalPages} />
    </>
  );
}

export default function App({ budget, filters = INITIAL_FILTERS }) {
  return (
    <ErrorBoundary>
      <DataProvider value={budget}>
        <FilterProvider value={filters}>
          <ThemeProvider>
            <Layout>
              <DataLoader ready={budget != null}>
                <BudgetGrid />
              </DataLoader>
            </Layout>
          </ThemeProvider>
        </FilterProvider>
      </DataProvider>
    </ErrorBoundary>
  );
}
