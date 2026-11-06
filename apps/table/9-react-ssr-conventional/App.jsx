// Arm 9 server tree, written the conventional way: context providers, custom
// hooks, a domain model, switch rendering and wrapper components. The browser
// hydrates it with ../shared-client/App.jsx, so the markup must match that
// client's first render.
import React, { useMemo } from 'react';
import { ThemeProvider, ErrorBoundary, Layout, DataLoader, createStore, useFormatters, sortIndicator } from './patterns.jsx';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'hireDate', label: 'Hire Date' },
  { key: 'salary', label: 'Salary' },
  { key: 'active', label: 'Active' },
];

const INITIAL_FILTERS = { filterText: '', sortCol: null, sortDir: null, currentPage: 1, selected: {} };
const noop = () => {};

const [DataProvider, useDirectory] = createStore('EmployeeData');
const [FilterProvider, useFilters] = createStore('EmployeeFilters');

function usePageView() {
  const directory = useDirectory();
  const filters = useFilters();
  return useMemo(() => directory.view(filters), [directory, filters]);
}

function useSelection(pageRows) {
  const { selected } = useFilters();
  return useMemo(() => ({
    isSelected: id => !!selected[id],
    count: Object.keys(selected).length,
    allVisible: pageRows.length > 0 && pageRows.every(r => selected[r.id]),
  }), [selected, pageRows]);
}

function CellValue({ employee, column }) {
  const fmt = useFormatters();
  switch (column) {
    case 'salary':
      return `$${fmt.number(employee.salary)}`;
    case 'active':
      return employee.active ? 'Yes' : 'No';
    default:
      return String(employee[column]);
  }
}

function FilterBar() {
  return (
    <div className="filter-bar">
      <input type="text" placeholder="Filter by name, email, or department..." data-role="filter-input" />
    </div>
  );
}

function Toolbar({ selection, totalFiltered }) {
  return (
    <div className="toolbar">
      <span className="selection-count">
        {selection.count} of {totalFiltered} selected
      </span>
      <button className="danger" disabled={selection.count === 0} data-action="delete-selected">
        Delete selected
      </button>
    </div>
  );
}

function HeaderRow({ selection }) {
  const { sortCol, sortDir } = useFilters();
  return (
    <tr>
      <th>
        <input type="checkbox" checked={selection.allVisible} onChange={noop} data-role="select-all" />
      </th>
      {COLUMNS.map(col => (
        <th key={col.key} data-column={col.key}>
          {col.label}
          <span className={`sort-indicator${sortCol === col.key ? ' active' : ''}`}>
            {sortIndicator(sortCol, sortDir, col.key)}
          </span>
        </th>
      ))}
    </tr>
  );
}

function EmployeeRow({ employee, selected }) {
  return (
    <tr className={selected ? 'selected' : ''} data-row={employee.id}>
      <td>
        <input type="checkbox" checked={selected} onChange={noop} data-role="row-checkbox" />
      </td>
      {COLUMNS.map(col => (
        <td key={col.key} data-column={col.key}><CellValue employee={employee} column={col.key} /></td>
      ))}
    </tr>
  );
}

function Pagination({ totalPages }) {
  const { currentPage } = useFilters();
  return (
    <div className="pagination">
      <button disabled={currentPage <= 1} data-action="prev-page">
        Previous
      </button>
      <span className="page-info" data-role="page-info">
        Page {currentPage} of {totalPages}
      </span>
      <button disabled={currentPage >= totalPages} data-action="next-page">
        Next
      </button>
    </div>
  );
}

function EmployeeTable() {
  const { pageRows, totalFiltered, totalPages } = usePageView();
  const selection = useSelection(pageRows);
  return (
    <>
      <FilterBar />
      <Toolbar selection={selection} totalFiltered={totalFiltered} />
      <table>
        <thead>
          <HeaderRow selection={selection} />
        </thead>
        <tbody>
          {pageRows.map(e => <EmployeeRow key={e.id} employee={e} selected={selection.isSelected(e.id)} />)}
        </tbody>
      </table>
      <Pagination totalPages={totalPages} />
    </>
  );
}

export default function App({ directory, filters = INITIAL_FILTERS }) {
  return (
    <ErrorBoundary>
      <DataProvider value={directory}>
        <FilterProvider value={filters}>
          <ThemeProvider>
            <Layout>
              <DataLoader ready={directory != null}>
                <EmployeeTable />
              </DataLoader>
            </Layout>
          </ThemeProvider>
        </FilterProvider>
      </DataProvider>
    </ErrorBoundary>
  );
}
