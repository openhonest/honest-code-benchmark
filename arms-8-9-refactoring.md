# Refactoring Arms 8 and 9: Suggestions for a Fair Ablation

**Repository:** `openhonest/honest-code-benchmark`, commit `0754d6a` (full hash `0754d6a3ffdfb19f95bda2175f9747b291301e0e`), read from a GitHub clone.
**Scope:** Arm 8 (`*-react-ssr-domain-classes`) and Arm 9 (`*-react-ssr-conventional`) in all five archetypes, measured against Arm 7 (`*-react-ssr-honest`).
**Date:** Oct. 29, 2026. Read-only. Nothing in the repository was changed. The checks below ran on a scratch copy.

---

## 1. Summary

**What the documents ask for.** Arm 8 is Arm 7 plus one change: raw JSON becomes "typed domain objects before the components receive it" (task spec, "Arm 8"). Arm 9 adds all five conventional patterns. All three arms must "produce identical HTML output for the same inputs" (task spec, end of the Arm 9 section).

**What the code does today.**

- **Arm 8** does not use per-row objects. It uses one mutable "model" object per archetype (`TableModel`, `FormModel`, `DashboardModel`, `BrowserModel`, `GridModel`) and calls `forceUpdate` after every mutation. That changes the state architecture, not just the data representation. Its getters re-run filter and sort three to seven times per render.
- **Arm 9** contains none of the five patterns. It is Arm 7 with the `lib.js` functions pasted inline.
- **All three arms** sort differently, format numbers differently, and in one case use different CSS class names.

**What I recommend.**

1. Define one shared baseline for behavior and client-side performance, and apply it to Arms 7, 8, and 9 alike. It covers sort rules, formatting, markup, memoization, and data loading.
2. Rebuild Arm 8 as Arm 7 with per-row domain classes and nothing else.
3. Rebuild Arm 9 with all five patterns, written the way a senior React developer would write them. That means split contexts, a reducer, clean custom hooks, memoized rows, and no empty wrappers.
4. Prove parity with a script before freeze.

**One finding cuts against Arm 7.** Arm 7 is the only arm whose comparator calls `localeCompare` with an options argument, which can make the engine set up a new collator on every comparison. MDN advises building one `Intl.Collator` and reusing its `compare` function when sorting large arrays (MDN, `String.prototype.localeCompare`, "Performance"). Arm 7's comparator should build one shared collator once. The shared baseline fixes this for all arms.

---

## 2. Ground rules for a fair ablation

These rules decide what goes in each arm. The author should adopt them in the task specification before refactoring.

**Rule A. Same behavior.** For the same data and the same interaction sequence, all three arms must produce the same DOM after every step. That covers sort order (including ties), filter results, formatting, IDs, page clamping, CSS classes, and `data-*` selectors.

**Rule B. Shared performance baseline.** Any technique that is not part of the independent variable goes into all three arms or none. This includes hoisted `Intl` formatters and collators, memoized derived data, stable callbacks, memoized rows, and keeping edit state local to the cell being edited. Code structure is the variable under test. Basic performance hygiene is not.

**Rule C. The variable, done well.** Arm 8 differs from Arm 7 only in data representation. Arm 9 differs in all five patterns, each written idiomatically. If the documentation recommends a particular idiomatic form of a pattern, use it, because that is how a skilled team would ship it.

**A decision the author must make first.** These React apps render the same component tree on the server and the client. Honest Code rule 1 forbids hooks ("No class components, no hooks"), yet Arm 7's `App.jsx` uses `useState`, `useMemo`, `useCallback`, and `useRef`. It must, because the page is interactive after hydration. There are two honest ways out:

- **Option 1 (recommended).** Restate rule 1 as "presentational components are pure functions; one top-level container owns client state." Then put that same container pattern (a `useState` and `useMemo` pipeline) in Arms 7 and 8. Arm 9 replaces it with providers, a reducer, and custom hooks, which are its conventional equivalents.
- **Option 2.** Restrict the ablation to server-only code. That would require separate server and client trees, a much larger change.

Either way, H10's sentence "all three hydrate to identical client-side code" will be false for Arm 9 once its patterns are real. Restate the client-side claim as an equivalence hypothesis with a stated margin, or make it exploratory.

---

## 3. What I verified

| Check | Method | Result |
|---|---|---|
| Initial SSR HTML, 1,000 rows | Bundled each arm's `server.jsx` with esbuild, rendered with `renderToString`, and compared | Table, form, and grid are identical. Dashboard: Arm 8 differs from Arm 7 (`class="cards"` vs. `"dashboard-cards"`). Dashboard and browser: Arm 9 (and Arm 8 for browser) emit extra `<!-- -->` text-node markers, so the raw bytes differ |
| Sort order, 10,000 table rows, first page | Arm 7 `sort_rows` vs. the Arm 8 and 9 comparator | Identical for name asc and salary asc. **Different** for name desc, department desc, hireDate desc, and active asc |
| Sort comparator construction | Code reading | Arm 7's comparator calls `localeCompare` with options, which can set up a collator on every comparison; MDN recommends one shared `Intl.Collator` for large sorts |
| Number formatting | `toLocaleString('en-US')` vs. a hoisted `Intl.NumberFormat` | Choose on correctness, not speed (see S2) |

The initial render hides most differences because nothing is sorted or edited yet. The real divergence shows up after interactions. That is why the parity check in Section 8 replays the interaction script.

---

## 4. Shared fixes (Arms 7, 8, and 9)

### S1. One sort rule, written once

**Current code.**

`apps/table/7-react-ssr-honest/lib.js`, lines 1–4 and 41–46:

```js
export function compare_string(a, b) {
  const cmp = a.localeCompare(b, undefined, { sensitivity: 'base' });
  ...
  const sorted = rows.slice().sort((a, b) => cmp(a[col], b[col]));
  return dir === 'desc' ? sorted.reverse() : sorted;
```

`apps/table/9-react-ssr-conventional/App.jsx`, lines 84–91 (Arm 8 `domain.js`, lines 96–103, is the same):

```js
if (typeof av === 'string') cmp = av.localeCompare(bv);
else if (typeof av === 'boolean') cmp = av === bv ? 0 : av ? -1 : 1;
else cmp = av - bv;
return sortDirection === 'desc' ? -cmp : cmp;
```

**Problems.**

1. The arms use different string rules: case-insensitive with base sensitivity in Arm 7, the default locale rules in Arms 8 and 9.
2. Booleans sort in opposite directions.
3. Ties come out in different orders. Reversing a stable sort reverses tied rows; negating the comparator keeps them in place.
4. Arm 7 builds a collator on every call. MDN recommends building one `Intl.Collator` and reusing it for large sorts.
5. The dashboard's `COLUMN_TYPE_MAP` in Arm 7 (`lib.js`, line 16) types `id` as `'number'`, but dashboard IDs are strings such as `"ORD-000001"`. The sort only works because `<` happens to compare those strings in the right order.

The same pattern appears in the browser and dashboard archetypes.

**Fix.** Write the rule into the task specification, then express it once per arm style.

```js
// Canonical sort semantics (all arms, all archetypes)
const collator = new Intl.Collator('en-US', { sensitivity: 'base' }); // hoisted: built once
const byType = {
  string:  (a, b) => collator.compare(a, b),
  number:  (a, b) => a - b,
  boolean: (a, b) => Number(a) - Number(b),       // false before true when ascending
};
export function sortRows(rows, col, dir, types) {
  const cmp = byType[types[col]];
  const sign = dir === 'desc' ? -1 : 1;            // negate, so ties keep data order
  return rows.slice().sort((a, b) => sign * cmp(a[col], b[col]));
}
```

Arm 7 keeps this as a plain function in `lib.js`. Arm 8 uses the same function, since domain objects expose the same field names. Arm 9 calls it from inside `useSortedRows` (see Section 6). The sort rule is behavior, not style, so its body should be the same in all three arms.

### S2. One formatter, with a fixed locale and a single text node

**Current code.**

- `apps/table/8-react-ssr-domain-classes/App.jsx` (since removed; Arm 8 now hydrates `apps/table/shared-client/App.jsx`), lines 33–37: `` `$${row[column].toLocaleString()}` ``. Arm 9 `App.jsx`, lines 42–46, has the same expression.
- `apps/dashboard/8-.../App.jsx`, line 14: `n.toLocaleString(undefined, {...})`.
- `apps/browser/9-.../App.jsx`, line 114: `<td>${row.value.toLocaleString()}</td>`.
- `apps/grid/8-.../App.jsx`, line 4, and `grid/9-.../App.jsx`, line 5: `toLocaleString(undefined, ...)`.

**Problems.**

1. `undefined` means "the runtime's default locale." The server may format as en-US while a browser set to another locale formats differently. React then reports a hydration mismatch and re-renders the client tree, a large hidden cost that only Arms 8 and 9 would pay. Arm 7 passes `'en-US'` and avoids this.
2. In JSX, `${row.value...}` outside a template literal is a literal `$` followed by an expression. React emits two text nodes and an `<!-- -->` marker between them. That adds bytes and DOM nodes compared with Arm 7, which builds one string.

**Fix.** Use one module of formatters in all three arms. In Arm 9, supply it through context (Section 6, pattern 1).

```js
// format.js (identical in Arms 7, 8, and 9)
const money2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const plain  = new Intl.NumberFormat('en-US');
export const formatSalary   = v => `$${plain.format(v)}`;   // table
export const formatCurrency = v => `$${money2.format(v)}`;  // dashboard
export const formatValue    = v => `$${plain.format(v)}`;   // browser
export const formatNumber   = v => money2.format(v);        // grid
```

Always return one string. Never put `$` and an expression side by side in JSX.

### S3. Identical markup and selectors

**Current code.** In `apps/dashboard/8-.../App.jsx`, line 38 uses `className="cards"` where Arm 7 uses `dashboard-cards`, and line 79 uses `badge badge-${status}` where Arm 7 uses `status-badge status-${status}`.

**Fix.** Treat Arm 7's markup as the reference. Each new component in Arm 9 must render exactly the same elements, classes, and `data-*` attributes. Layout and error-boundary wrappers must render no DOM of their own (Section 6, pattern 5). When the harness selectors are fixed (see the main review, Issue 3), change all three arms in the same commit.

### S4. ID handling

Table, browser, and grid IDs are integers. Dashboard IDs are strings. All three arms key selection by `selectedIds[row.id]` on a plain object, which turns keys into strings but still finds the rows. Keep that behavior identical:

- Domain classes must store `id` exactly as it arrives. Do not wrap it in `String()` or `Number()`.
- Equality checks must use the same types. `find(r => r.id === id)` works only because the `id` comes from a row, not from a query string.
- If any arm moves selection to a `Set`, move all three.

### S5. Data loading

- **Dead fetch code.** Arms 8 and 9 include a fallback `useEffect` that fetches data if `initialData` is missing. Arm 7 includes it for form, dashboard, and grid but not for table or browser. Under SSR, `initialData` is always present, so the fallback is dead code that only adds bundle bytes. Remove it from all three arms or include it in all three.
- **Where domain objects are built.** Arm 8 and Arm 9 must turn JSON into domain objects at the same point on the server (inside `render`, so `Server-Timing` captures it) and on the client (in `index.jsx`, before `hydrateRoot`). Both sides must build the same objects, or hydration will mismatch.

### S6. Behavior differences to remove

- **Page clamping.** `apps/table/8-.../domain.js`, line 78, clamps `currentPage` after a delete. Arms 7 and 9 do not. Pick one rule and apply it everywhere. Clamping is the more correct choice.
- **In-place mutation.** Arm 8 mutates rows in place (`commitEdit`, `bulkFill`), which also changes the objects in `window.__SSR_DATA__`. Arms 7 and 9 copy. Use immutable updates everywhere.
- **Reset page in an effect.** Dashboard Arms 7 and 9 reset the page with `useEffect(() => { setCurrentPage(1); }, [filters])` (Arm 7, line 73; Arm 9, line 75). That costs an extra render after every filter change. The React docs advise resetting in the event handler instead (react.dev, "You Might Not Need an Effect"). Fix it in all three arms.
- **Side effects in updaters.** Arms 7 and 9 call `setSortDirection` and `setSortColumn` inside other state updaters (table `App.jsx`: Arm 7, lines 76–89; Arm 9, lines 99–112). Updater functions must be pure, and StrictMode calls them twice. Compute the next sort state from current values in Arm 7 and Arm 8, and in a reducer in Arm 9.

### S7. Memoization baseline

Arm 7 memoizes its pipeline in stages (`filtered` → `sorted` → `page`), so changing pages does not re-sort. Arm 8 has no memoization: `getPageRows`, `getTotalPages`, and `getTotalFiltered` each re-run filter and sort (table `domain.js`, lines 108–120). In the dashboard, `getFiltered()` runs about seven times per render, and each run sorts (`domain.js`, lines 35–75). Arm 9's dashboard recomputes KPIs on every render (lines 56–58). Give all three arms the same staged memoization. Section 7 lists every place where Arm 7 currently has an edge.

---

## 5. Arm 8: Honest Code plus per-row domain classes

### 5.1 Intent

The task spec says: "An `Employee` class has methods like `fullName()` and `isActive()`. A `DashboardData` class computes aggregates. Components receive class instances, not plain objects. ... Domain class instantiation scales linearly with row count." H11 depends on that linear, per-row cost.

### 5.2 Design rules for the classes

These are the rules a senior developer would follow.

- **One class per record type.** Data lives in public fields with the JSON names, so the shared `sortRows`, filters, and config tables work unchanged.
- **Methods on the prototype.** No arrow-function class fields, which allocate one closure per instance per method.
- **Same field order in every constructor,** so V8 keeps one hidden class.
- **Immutable updates through `with(field, value)`.** They allocate only on an edit, just as Arm 7's spread does.
- **No cached derived fields** (for example, a precomputed lowercase name) unless Arm 7 caches the same value. Caching would move work from the filter to the constructor and change what H11 measures.
- **A static `fromJSON` factory, and nothing more.** No `Object.freeze` and no validation layers that Arm 7 lacks. Those would add work outside the variable.

### 5.3 Full example: table

**Replace** `apps/table/8-react-ssr-domain-classes/domain.js` (the 125-line `TableModel` with state, getters, and mutators) and the `forceUpdate` wiring in `App.jsx`, lines 54–59.

```js
// apps/table/8-react-ssr-domain-classes/domain.js
import { formatSalary } from './format.js';

export class Employee {
  constructor(id, name, email, department, hireDate, salary, active) {
    this.id = id; this.name = name; this.email = email; this.department = department;
    this.hireDate = hireDate; this.salary = salary; this.active = active;
  }
  static fromJSON(r) {
    return new Employee(r.id, r.name, r.email, r.department, r.hireDate, r.salary, r.active);
  }
  isActive() { return this.active; }
  matches(lowerText) {                       // same work as Arm 7 filter_rows
    return this.name.toLowerCase().includes(lowerText)
      || this.email.toLowerCase().includes(lowerText)
      || this.department.toLowerCase().includes(lowerText);
  }
  display(column) { return (DISPLAY[column] ?? DISPLAY.default)(this, column); }
  with(column, raw) {                         // same parse rule as Arm 7 commit_edit
    const next = Employee.fromJSON(this);
    next[column] = column === 'salary' ? (parseInt(raw, 10) || this.salary) : raw;
    return next;
  }
}

const DISPLAY = {                              // config table, as Honest Code rule 4 requires
  salary:  e => formatSalary(e.salary),
  active:  e => (e.active ? 'Yes' : 'No'),
  default: (e, c) => String(e[c]),
};

export const toEmployees = rows => rows.map(Employee.fromJSON);
```

```js
// server.jsx and index.jsx: build domain objects at the boundary on both sides
export function render(data) { return renderToString(<App initialData={toEmployees(data)} />); }
// index.jsx
hydrateRoot(root, <App initialData={toEmployees(window.__SSR_DATA__)} />);
```

`App.jsx` then becomes Arm 7's `App.jsx` with three small changes:

- `filter_rows(data, text)` becomes `text ? data.filter(e => e.matches(lower)) : data`.
- `format_cell(column, row[column])` becomes `row.display(column)`.
- `commit_edit` becomes `prev.map(e => e.id === id ? e.with(column, value) : e)`.

Everything else in `App.jsx` stays line for line the same: the state hooks, the staged `useMemo`, the handlers, and the markup. Run `diff` between Arm 7 and Arm 8. The only changed lines should be the ones that touch rows.

### 5.4 Other archetypes

| Archetype | Replace | With | Methods (each mirrors one Arm 7 function) |
|---|---|---|---|
| Form | `FormModel` (`domain.js`, lines 13–83), which holds step, errors, and fields | `Customer` per record, plus a `CheckoutDraft` value class for the edited fields | `Customer.fromJSON`, `customer.toDraft()` (replaces `prefill_from_record`); `draft.with(name, value)`, `draft.errorsForStep(n)` (replaces `next_step`, `validate_step`, `validate_business`), `draft.reviewLines()` (replaces `format_review`). Step and errors stay in `useState`, as in Arm 7 |
| Dashboard | `DashboardModel` (lines 3–84) | `Order` per record, plus `DashboardData` for aggregates, as the spec names it | `Order`: `inCategory(c)`, `hasStatus(s)`, `inRange(from, to)`, `display(col)`. `DashboardData.from(orders)` returns `{ totalOrders, totalRevenue, avgOrder, uniqueCustomers }` using Arm 7's `compute_kpis` algorithm, memoized on `filtered` |
| Browser | `BrowserModel` (lines 3–72) | `BrowserRecord` per record | `matchesName(lower)`, `hasStatus(s)`, `formattedValue()` |
| Grid | `GridModel` (lines 3–106) | `BudgetLine` per record, plus `BudgetTotals` | `BudgetLine`: `total()`, `variance()`, `isOverBudget()`, `with(quarter, value)`. `BudgetTotals.from(lines)` mirrors `compute_totals` |

**Form needs a decision.** The form uses only record 0. Mapping all 100,000 records to `Customer` objects is pure overhead, so a reviewer will ask why. Either fix the form's payload role (main review, Issue 2) or map only the record the form uses, and write the choice into the specification. I recommend fixing the payload role first.

---

## 6. Arm 9: Full conventional React

### 6.1 The five patterns, quoted from the task specification

1. "**Context providers for shared data.** Filter state, theme, and data access are provided through React Context. Components read from context via `useContext`. The component tree wraps inward through providers: `<DataProvider>` → `<FilterProvider>` → `<ThemeProvider>` → `<Layout>` → content."
2. "**Custom hooks for data transformation.** Components call hooks like `useFilteredData(filters)` and `useSortedData(data, sortConfig)` that compute derived state. The transformation logic lives inside the hook, not in a standalone function."
3. "**Domain model classes.** Same as Arm 8: raw JSON is transformed into typed domain objects before rendering."
4. "**Conditional rendering via branching.** Components use if/else or switch statements to select what to render based on type, status, or mode. A dashboard widget renders differently based on its `widgetType` prop through a switch statement, not a lookup table."
5. "**Component hierarchy for cross-cutting concerns.** Layout, error handling, and loading states are handled by wrapper components that nest inward. A page component extends a layout that wraps an error boundary that wraps a data loader."

The preregistration's short list matches: "context providers, custom hooks, domain classes, conditional branching, component hierarchies" (line 21).

### 6.2 Full example: table

The layout follows a common feature-folder structure:

```
table/9-react-ssr-conventional/
  domain/Employee.js           // pattern 3: import or copy Arm 8's class unchanged
  context/TableDataContext.jsx // pattern 1: rows and dispatch
  context/TableViewContext.jsx // pattern 1: sort, filter, page, selection
  context/FormatContext.jsx    // pattern 1: the spec's "theme" slot (see note)
  hooks/useFilteredRows.js     // pattern 2
  hooks/useSortedRows.js
  hooks/usePagination.js
  hooks/useDebouncedCallback.js
  components/ErrorBoundary.jsx // pattern 5
  components/PageLayout.jsx
  components/DataLoader.jsx
  components/CellContent.jsx   // pattern 4
  components/TableRow.jsx, TableHeader.jsx, Toolbar.jsx, FilterBar.jsx, Pagination.jsx
  App.jsx, server.jsx, index.jsx
```

**Pattern 1: providers, split as the React docs recommend.** The docs pair a reducer with context and put state and dispatch in separate contexts, so components that only dispatch do not re-render when state changes (react.dev, "Scaling Up with Reducer and Context"). Context values are memoized (react.dev, `useContext`, "Optimizing re-renders when passing objects and functions").

```jsx
// context/TableViewContext.jsx
const ViewState = createContext(null);
const ViewDispatch = createContext(null);

function viewReducer(state, action) {
  switch (action.type) {                         // reducers with switch are the documented idiom
    case 'sort': {
      if (state.sortColumn !== action.column) return { ...state, sortColumn: action.column, sortDirection: 'asc' };
      if (state.sortDirection === 'asc') return { ...state, sortDirection: 'desc' };
      return { ...state, sortColumn: null, sortDirection: null };
    }
    case 'filter':  return { ...state, filterText: action.text, currentPage: 1 };
    case 'page':    return { ...state, currentPage: action.page };
    case 'toggle':  return { ...state, selectedIds: toggleId(state.selectedIds, action.id) };
    case 'toggleAll': return { ...state, selectedIds: toggleAll(state.selectedIds, action.ids) };
    case 'clearSelection': return { ...state, selectedIds: {} };
    default: throw new Error(`Unknown action: ${action.type}`);
  }
}

export function TableViewProvider({ children }) {
  const [state, dispatch] = useReducer(viewReducer, INITIAL_VIEW);
  return (
    <ViewDispatch.Provider value={dispatch}>       {/* dispatch is stable, so no memo is needed */}
      <ViewState.Provider value={state}>{children}</ViewState.Provider>
    </ViewDispatch.Provider>
  );
}
export const useTableView = () => useContext(ViewState);
export const useTableViewDispatch = () => useContext(ViewDispatch);
```

`TableDataContext` follows the same shape for rows (`edit` and `deleteSelected` actions over `Employee[]`). `DataProvider` receives `initialData` already converted to domain objects.

**Note on `ThemeProvider`.** These apps have no theme. An empty `ThemeProvider` with no consumers is the clearest sign of a strawman. Give the slot a real job instead: a `FormatProvider` that supplies the shared `Intl` formatters from S2 through `useFormat()`. Real apps commonly provide locale and formatting this way. The spec's wording ("theme") should change to match. Do not add a provider that nothing reads.

**Pattern 2: custom hooks that hold the transformation logic.** The spec says the logic lives inside the hook. Each hook still memoizes, as a senior developer would (react.dev, `useMemo` and "Reusing Logic with Custom Hooks").

```js
// hooks/useFilteredRows.js
export function useFilteredRows(rows, filterText) {
  return useMemo(() => {
    if (!filterText) return rows;
    const lower = filterText.toLowerCase();
    return rows.filter(e => e.matches(lower));
  }, [rows, filterText]);
}

// hooks/useSortedRows.js
const collator = new Intl.Collator('en-US', { sensitivity: 'base' });
const COMPARE = { string: (a, b) => collator.compare(a, b), number: (a, b) => a - b, boolean: (a, b) => Number(a) - Number(b) };
export function useSortedRows(rows, { sortColumn, sortDirection }) {
  return useMemo(() => {
    if (!sortColumn || !sortDirection) return rows;
    const cmp = COMPARE[COLUMN_TYPES[sortColumn]];
    const sign = sortDirection === 'desc' ? -1 : 1;
    return rows.slice().sort((a, b) => sign * cmp(a[sortColumn], b[sortColumn]));
  }, [rows, sortColumn, sortDirection]);
}

// hooks/usePagination.js
export function usePagination(rows, page, perPage = 25) {
  return useMemo(() => {
    const start = (page - 1) * perPage;
    return { pageRows: rows.slice(start, start + perPage), totalPages: Math.max(1, Math.ceil(rows.length / perPage)), total: rows.length };
  }, [rows, page, perPage]);
}

// hooks/useDebouncedCallback.js: replaces the inline setTimeout and useRef
export function useDebouncedCallback(fn, ms) {
  const timer = useRef(); const latest = useRef(fn);
  useEffect(() => { latest.current = fn; });
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback((...args) => { clearTimeout(timer.current); timer.current = setTimeout(() => latest.current(...args), ms); }, [ms]);
}
```

The sort body must match S1 exactly. Only its location changes.

**Pattern 3: domain classes.** Import or copy Arm 8's `Employee` unchanged and convert at the same boundary (S5). If the two arms share one file, pattern 3 is identical in Arms 8 and 9 by construction, which is what the spec says ("Same as Arm 8").

**Pattern 4: branching.** A `switch` inside a cell component is the textbook form (react.dev, "Conditional Rendering").

```jsx
// components/CellContent.jsx
export function CellContent({ employee, column }) {
  const { formatSalary } = useFormat();
  switch (column) {
    case 'salary': return formatSalary(employee.salary);
    case 'active': return employee.isActive() ? 'Yes' : 'No';
    default:       return String(employee[column]);
  }
}
```

It returns a single string, so the markup matches Arm 7.

**Pattern 5: wrapper hierarchy with no extra DOM.**

```jsx
// components/ErrorBoundary.jsx: React still requires a class for error boundaries
export class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error(error, info.componentStack); }
  render() { return this.state.error ? <div className="app" role="alert">Something went wrong.</div> : this.props.children; }
}

// components/PageLayout.jsx: owns the one wrapper element Arm 7 already renders
export const PageLayout = ({ children }) => <div className="app">{children}</div>;

// components/DataLoader.jsx: SSR always supplies data, so this renders children
export function DataLoader({ children }) {
  const { rows, status } = useTableData();
  if (status === 'loading') return <p className="loading">Loading…</p>;
  return children(rows);
}

// App.jsx
export default function App({ initialData }) {
  return (
    <TableDataProvider initialRows={initialData}>
      <TableViewProvider>
        <FormatProvider locale="en-US">
          <PageLayout>
            <ErrorBoundary>
              <DataLoader>{rows => <EmployeeTablePage rows={rows} />}</DataLoader>
            </ErrorBoundary>
          </PageLayout>
        </FormatProvider>
      </TableViewProvider>
    </TableDataProvider>
  );
}
```

The spec's order is "a layout that wraps an error boundary that wraps a data loader." The tree above follows it. `PageLayout` renders the `<div class="app">` that Arm 7 already has, so the HTML does not change.

**Rows: memoized, with edit state kept local.** This is the main client-side technique a senior developer would add.

```jsx
// components/TableRow.jsx
export const TableRow = memo(function TableRow({ employee, selected, onToggle, onCommit }) {
  return (
    <tr className={selected ? 'selected' : ''} data-row={employee.id}>
      <td><input type="checkbox" checked={selected} onChange={() => onToggle(employee.id)} data-role="row-checkbox" /></td>
      {COLUMNS.map(c => <EditableCell key={c.key} employee={employee} column={c.key} onCommit={onCommit} />)}
    </tr>
  );
});
// EditableCell keeps its own `editing` and `draft` state, so typing re-renders one cell, not the table.
// onToggle and onCommit come from useCallback over dispatch, so they are stable and memo holds.
```

**Rule B applies here.** Memoized rows and local edit state avoid the work of Arm 7's current approach, which re-renders every cell on every keystroke because `editingCell` and `editingValue` live at the top. They are not part of the independent variable. Option A (recommended): put the same `memo(TableRow)` and local edit state into Arms 7 and 8 too. Arm 7's `React.memo` is a wrapper, not a hook, so it does not break rule 1. Option B: give these techniques only to Arm 9 and state in the paper that "conventional" includes them. Option A keeps the comparison about code structure.

### 6.3 Other archetypes

| Pattern | Form | Dashboard | Browser | Grid |
|---|---|---|---|---|
| 1. Context | `CheckoutProvider` (reducer: `setField`, `next`, `back`, `submit`), with state and dispatch split; `FormatProvider` not needed | `OrdersDataProvider`; `DashboardFiltersProvider` (category, status, dates, sort, page); `FormatProvider` | `RecordsDataProvider`; `BrowserViewProvider` (search, status, sort, page, `selectedId`); `FormatProvider` | `BudgetDataProvider` (lines with `edit` and `bulkFill` actions); `GridViewProvider` (category, page, selection, bulk quarter and value); `FormatProvider` |
| 2. Custom hooks | `useStepValidation(draft, step)`, `useReviewLines(draft)`, `useCheckoutNavigation()` | `useFilteredOrders(filters)`, `useSortedRows`, `usePagination`, `useDashboardSummary(filtered)` (memoized aggregates) | `useDebouncedCallback`, `useFilteredRecords`, `useSortedRows`, `usePagination`, `useSelectedRecord(id)` | `useCategoryFilter`, `usePagination`, `useBudgetTotals(filtered)`, `useRowSelection`, `useBulkFill` |
| 3. Classes | `Customer`, `CheckoutDraft` (shared with Arm 8) | `Order`, `DashboardData` (shared) | `BrowserRecord` (shared) | `BudgetLine`, `BudgetTotals` (shared) |
| 4. Branching | `switch (step)` in `<CheckoutStep>` returning `ContactStep`, `AddressStep`, `AccountStep`, or `ReviewStep`; `if (draft.isBusiness())` for the extra fields | The spec's own example: `<StatCard widgetType="count" \| "currency">` with a `switch`; the four KPI cards become four `StatCard`s | `switch (column)` in `<RecordCell>`; `if (!record) return null` for the detail panel | `if/else` in `<VarianceCell>` for over and under budget; `switch (field)` in `<GridCell>` for editable vs. computed cells |
| 5. Hierarchy | `PageLayout` > `ErrorBoundary` > `DataLoader` > `CheckoutPage` | Same | Same | Same |
| Memo | Memoize step components on `draft` and `errors` | `memo(OrderRow)`; `StatCard` receives one primitive value | `memo(RecordRow)`; the detail panel reads only `selectedId` | `memo(BudgetRow)` with local cell edit state (the cell-edit cascade is the archetype's point, so this matters most here) |

**Form review markup.** Arm 9's review list renders `{fields.firstName} {fields.lastName}` (form `App.jsx`, line 184 onward). React emits three text nodes and `<!-- -->` markers, while Arm 7 emits one string. Use `draft.reviewLines()` and render `line.value` as Arm 7 does.

---

## 7. Where Arm 7 has an edge that Arms 8 and 9 should also get, and the reverse

| # | Place | Arm 7 today | Arms 8 and 9 today | Recommendation |
|---|---|---|---|---|
| 1 | Pipeline memoization | Staged `useMemo` for filter, sort, and page | Arm 8: none; filter and sort run 3–7 times per render. Arm 9: filter and sort merged, which is fine, but KPIs and page rows are recomputed every render | Staged memoization in all arms (hooks in Arm 9, `useMemo` in Arms 7 and 8) |
| 2 | Fixed locale | `'en-US'` everywhere | `undefined` locale, which risks a hydration mismatch and a full client re-render | Shared `format.js` (S2) |
| 3 | Single text nodes | Template strings | `$` plus an expression, which adds `<!-- -->` markers and extra nodes | Return one string |
| 4 | Stable `handleToggleAll` | Depends on memoized `page.pageRows` | Arm 9 depends on unmemoized `pageRows`, so the callback changes every render | `usePagination` returns memoized rows |
| 5 | Immutable updates | Copies rows | Arm 8 mutates in place and forces an update | `with()` methods and normal state |
| 6 | Less dead code (table, browser) | No fallback fetch | Fallback fetch present | Same choice in all arms |
| **Reverse** | Sort collator | A new collator on every comparison | Plain `localeCompare` with no options, so no per-call collator setup | Hoisted `Intl.Collator` in all arms (S1) |
| **Reverse** | Edit state | Top-level, so every cell re-renders per keystroke | Same in Arm 9; Arm 8 forces a full update | Local edit state and memoized rows in all arms (Rule B) |
| **Reverse** | Dashboard page reset | Extra render through `useEffect` | Arm 9 the same; Arm 8 resets in the setter | Reset in the event handler in all arms |

---

## 8. Parity check

### 8.1 Server HTML parity (already run on a scratch copy)

This script bundles each arm's `server.jsx`, renders it, and compares the output. Add it to the repository as `scripts/parity-ssr.mjs` and run it for every payload size.

```js
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
const ARCH = ['table', 'form', 'dashboard', 'browser', 'grid'];
const ARMS = ['7-react-ssr-honest', '8-react-ssr-domain-classes', '9-react-ssr-conventional'];
const rows = process.argv[2] ?? '1000';
for (const a of ARCH) {
  const data = JSON.parse(readFileSync(`data/${a}/${rows}.json`, 'utf8'));
  const html = {};
  for (const arm of ARMS) {
    const out = `.parity/${a}-${arm}.mjs`;
    await build({ entryPoints: [`apps/${a}/${arm}/server.jsx`], bundle: true, format: 'esm',
      platform: 'node', outfile: out, jsx: 'automatic', external: ['react', 'react-dom'], logLevel: 'silent' });
    html[arm] = (await import(`../${out}`)).render(structuredClone(data));
  }
  const [h7, h8, h9] = ARMS.map(k => html[k]);
  const ok = h7 === h8 && h7 === h9;          // compare raw bytes; markers count as bytes shipped
  console.log(`${a} ${rows}: ${ok ? 'PASS' : 'FAIL'}`);
  if (!ok) process.exitCode = 1;
}
```

Compare raw HTML, not a normalized version. The `<!-- -->` markers are bytes the browser receives and nodes it builds.

### 8.2 Interaction parity (needed before freeze)

Use Playwright. Load each of Arms 7, 8, and 9 at each payload size. Run the archetype's interaction script one step at a time. After each step, capture `document.querySelector('#root').innerHTML` and compare across arms. Also run sort-only sequences (every column, ascending and descending) and edit and delete sequences, because those are where the arms diverge today.

```js
for (const step of steps[archetype]) {
  const snaps = {};
  for (const arm of ARMS) { await step(pages[arm]); snaps[arm] = await pages[arm].innerHTML('#root'); }
  assert.equal(snaps[ARMS[1]], snaps[ARMS[0]], `${archetype} ${step.name}: 8 vs 7`);
  assert.equal(snaps[ARMS[2]], snaps[ARMS[0]], `${archetype} ${step.name}: 9 vs 7`);
}
```

### 8.3 Equal-work checks

- **Renders.** Wrap each arm's root in `<Profiler>` in a debug build. For each interaction, record commit count and the number of components rendered. Differences should come only from the patterns (for example, provider layers), not from missing memoization.
- **Structure.** Run `diff` between Arm 7 and Arm 8 `App.jsx`. Only lines that touch rows should differ. Record that diff in the deposit.
- **Bundles.** Report each arm's client bundle size. Arm 9 should be larger because of its providers and hooks. A large gap beyond that points to accidental extra code.

---

## 9. Strawman risks and how to avoid them

A reviewer would call Arm 9 a strawman if it showed any of these:

- **Empty providers.** A `ThemeProvider` that nothing reads. Fix: give every provider a consumer, or drop it.
- **One giant context.** Holding all state, including the edit draft, so every keystroke re-renders the whole tree. Fix: split state and dispatch contexts, and keep edit state local.
- **Unmemoized hooks or inline objects** passed as context values. Fix: `useMemo` in hooks, `dispatch` as the stable action handle.
- **Deep wrappers that add `<div>`s,** which make the HTML heavier. Fix: wrappers render no DOM of their own, except `PageLayout`'s existing `.app` div.
- **Contrived switches.** For example, a `switch` on status when every case renders the same markup. Fix: branch only where the output really differs (column type, step, widget type, variance sign).
- **No `memo` on large lists,** which any competent team would add. Fix: `memo` rows with stable callbacks.

The strongest protection is not on this list. **Have an independent React developer write Arm 9, or at least review it,** from the corrected specification and this document, without being told the hypotheses. Ask that developer to sign a short statement that the code is how they would ship it, and to name any changes they would make. Do the same for Arm 8 with someone experienced in domain modeling. Publish both reviews with the freeze deposit. The research plan already calls an independent implementer the strongest answer to the conflict of interest.

---

## 10. Summary tables

### 10.1 What goes into Arms 8 and 9

| Practice or pattern | Arm(s) | Why it counts as conventional | Source |
|---|---|---|---|
| Per-row domain classes with `fromJSON`, behavior methods, and immutable `with()` | 8, 9 | The task spec names this pattern; it is the standard "domain model" object with data and behavior together | Task spec, "Arm 8"; Martin Fowler, *Patterns of Enterprise Application Architecture*, "Domain Model" |
| Aggregate class (`DashboardData`, `BudgetTotals`) | 8, 9 | The spec names `DashboardData`; aggregates live on a model class in this style | Task spec, "Arm 8" |
| Methods on the prototype, a fixed field order, and no per-instance closures | 8, 9 | Standard JavaScript class performance practice; avoids extra allocation in the hot path | MDN, "Classes"; V8 blog, "Fast properties in V8" |
| Context providers with state and dispatch split | 9 | The React docs' recommended way to share state across a tree | react.dev, "Scaling Up with Reducer and Context" |
| `useReducer` with a `switch` reducer | 9 | The documented idiom for complex state; also makes state updates pure | react.dev, "Extracting State Logic into a Reducer" |
| Memoized context values; stable `dispatch` | 9 | The React docs' guidance against needless re-renders from context | react.dev, `useContext`, "Optimizing re-renders when passing objects and functions" |
| `FormatProvider` in the spec's "theme" slot | 9 | Providing locale and formatting through context is common; it gives the slot a real consumer | react.dev, "Passing Data Deeply with Context" (lists theming and similar shared values as use cases) |
| Custom hooks holding transformation logic (`useFilteredRows`, `useSortedRows`, `usePagination`, `useDashboardSummary`, `useBudgetTotals`) | 9 | The spec names this pattern; it is the documented way to reuse stateful logic | Task spec, pattern 2; react.dev, "Reusing Logic with Custom Hooks" |
| `useMemo` inside hooks for derived data | 9 (and 7, 8 under Rule B) | The documented way to skip expensive recalculation | react.dev, `useMemo` |
| `useDebouncedCallback` hook | 9 | Replaces inline timer code with a reusable hook, as conventional codebases do | react.dev, "Reusing Logic with Custom Hooks" |
| `switch` or `if/else` for conditional rendering | 9 | The spec names this pattern; it is the textbook form | Task spec, pattern 4; react.dev, "Conditional Rendering" |
| Class `ErrorBoundary`, `PageLayout`, and `DataLoader` wrappers | 9 | The spec names this hierarchy; React still requires a class for error boundaries | Task spec, pattern 5; react.dev, `Component`, "Catching rendering errors with an error boundary" |
| Feature-folder layout (`context/`, `hooks/`, `components/`, `domain/`) | 9 | Common project structure in React teams | Common practice; no single official source |
| `memo` on rows with stable `useCallback` handlers | 9 (and 7, 8 under Rule B) | The documented fix for re-rendering large lists | react.dev, `memo`; react.dev, `useCallback` |
| Local edit state in the editing cell | 9 (and 7, 8 under Rule B) | The docs advise keeping state close to where it is used | react.dev, "Choosing the State Structure" and "Sharing State Between Components" |
| Reset page in the event handler, not in an effect | 7, 8, 9 | The documented way to avoid extra renders | react.dev, "You Might Not Need an Effect" |
| Hoisted `Intl.Collator` and `Intl.NumberFormat` with a fixed locale | 7, 8, 9 | MDN recommends `Intl.Collator` for sorting large arrays; a fixed locale prevents hydration mismatches | MDN, `String.prototype.localeCompare`; react.dev, `hydrateRoot` |
| Stable keys (`row.id`) | 7, 8, 9 | Already present in all arms; keep it | react.dev, "Rendering Lists" |

### 10.2 Arm 7 techniques deliberately left out of Arm 9

| Arm 7 technique | Why it is left out of Arm 9 | Kept in Arm 8? |
|---|---|---|
| Free-standing pure functions in `lib.js` that components or `App` call directly (`filter_rows`, `sort_rows`, `paginate`) | The spec says transformation logic "lives inside the hook, not in a standalone function" | Yes, adapted to accept domain objects |
| Config tables in place of conditionals (`sort_comparators`, a `DISPLAY` map) | Pattern 4 calls for `switch` or `if/else` | Yes |
| Plain JSON objects passed straight to components | Pattern 3 requires domain classes | No; this is Arm 8's one change |
| A single flat `App` that receives everything as props, with no providers or wrappers | Patterns 1 and 5 call for providers and a wrapper hierarchy | Yes |
| Snake_case function names (`format_cell`, `compute_kpis`) | Not idiomatic JavaScript; Arm 9 uses camelCase | Yes, for a minimal diff from Arm 7 (cosmetic; no effect on performance) |
| `.hd` spec files, BDD `.feature` files, and tests that only Arm 7 has | They are not code-structure patterns; they show uneven effort | Not applicable. Give all three arms the same acceptance tests, or none |

**Not left out, because they are behavior or baseline rather than style:** the sort rule (S1), formatting (S2), markup and selectors (S3), ID handling (S4), page clamping and immutable updates (S6), and staged memoization (S7). These are the same in all three arms by design.

---

## 11. Limits of this document

- The code sketches are illustrations. I did not apply them to the repository or run them against the harness.
- This document reports no timing figures. Statements about engine behavior cite documentation, not measurements.
- The parity script ran only on initial SSR output at 1,000 rows. Interaction parity (Section 8.2) is a recommendation, not a result.
- The cited React and MDN pages are standard documentation. I did not re-fetch them for this document.

---

## Addendum (Oct. 29, 2026): shared client and SQLite for server-rendered arms

This addendum records two author decisions and revises the guidance above where they conflict with it. Where this section and an earlier section disagree, this section governs. Earlier sections are left unchanged so the reasoning stays traceable.

### A1. Summary of changes

1. **The client for Arms 7, 8, and 9 is Arm 1's client, unchanged.** Arm 1 is the `useState` CSR arm. The three SSR arms differ only on the server. Every earlier suggestion that touched client code in Arms 8 and 9 either moves into a server-only render tree or is dropped. Arm 7's current client must also revert to Arm 1's.
2. **Server-side patterns stay; client-side patterns go.** Domain classes, contexts and providers, custom hooks, switch-based cell rendering, and the ErrorBoundary, PageLayout, and DataLoader wrappers stay, but only in a server tree. Memoized rows, local edit state, `useCallback` tuning, the reducer, the debounce hook, the fetch fallback, and client-side domain objects come out of Arms 8 and 9.
3. **Hydration constrains the server trees, not the client.** React hydrates DOM output, not component identity. Each arm's server tree may be built differently but must emit markup byte-identical to the first render of Arm 1's component, down to the `<!-- -->` text-node separators.
4. **Arms 6, 10, and 11 read from SQLite.** They query one file built from the committed JSON, sort with `ORDER BY ... COLLATE NOCASE, id`, and page with `LIMIT` and `OFFSET`. No custom collation is portable across better-sqlite3, `node:sqlite`, and Python, so the canonical sort rule must become one SQLite can express. On this box, that rule matched a JavaScript reference on all 12 column and direction pairs at 100,000 rows.
5. **The canonical sort rule changes for every arm.** The new rule is ASCII case-insensitive code-point order with ties broken by ascending `id` in both directions. It must go into Arm 1, and so into Arms 7, 8, and 9, and into the CSR arms. It replaces the `Intl.Collator` rule in S1.
6. **Two ID bugs block the table's edit and delete in Arms 10 and 11.** They must be fixed before any mutation timing means anything.
7. **The preregistration needs three amendments.** H10 must be restated. The data-access strategy must be named as part of the rendering-mode variable. "Static JSON data files (identical across all arms)" must become "SQLite files built from the identical JSON files."

### A2. Which arm the client must match

**Arm 1.** The evidence:

- `task-specification.md` line 236: "Arm 7 ... then hydrates on the client. After hydration, interactions are client-side (identical to Arm 1)."
- Line 59: "After hydration, interactions are client-side (identical to Arm 1 and Arm 7)."
- Lines 238 and 240 define Arms 8 and 9 as identical to Arm 7 except on the server.
- `preregistration.md` line 49 (H10): "all three hydrate to identical client-side code."

The code does not match the spec today. I counted changed lines with `diff` between each arm's `App.jsx` and Arm 1's:

| Archetype | Arm 1 vs. Arm 7 | Arm 1 vs. Arm 8 | Arm 1 vs. Arm 9 |
|---|---|---|---|
| table | 100 | 221 | 16 |
| form | 119 | 165 | 80 |
| dashboard | 44 | 109 | 0 |
| browser | 119 | 122 | 65 |
| grid | 131 | 149 | 96 |

Arm 9's table differs from Arm 1 only in the data source. It takes an `initialData` prop and skips the fetch when data is present. That small diff is the right shape for all three SSR arms. Arm 7 has the largest client drift that matters for behavior. Its `lib.js` changes the sort (base-sensitivity collator, false-first booleans, `reverse()` for descending), and it builds a collator on every comparison. Under the new rule, that code leaves the client. The per-comparison collator becomes moot for client metrics, and Rule B in Section 2 no longer applies to client code.

### A3. What "server architecture" covers

The independent variable among Arms 7, 8, and 9 is everything that runs on the server per request, and nothing else:

1. **The Express route handler:** parse the request, choose the archetype and size, and set headers, including `Server-Timing`.
2. **Data loading:** read the dataset. Today that is `readFileSync` plus `JSON.parse` in `apps/server.js`. It could become a SQLite read (Section A7.9).
3. **Domain mapping:** Arm 8 maps JSON to classes; Arm 9 maps to classes as part of its five patterns; Arm 7 uses plain objects.
4. **The server pipeline:** derive the initial view (filter, sort, and page with default state, which for the table is page 1 in data order, plus dashboard aggregates).
5. **The server render tree passed to `renderToString`:** flat pure functions in Arm 7; pure functions over domain objects in Arm 8; providers, hooks, switch rendering, and wrapper hierarchy in Arm 9.
6. **Serialization:** write `window.__SSR_DATA__` and the HTML shell.

Steps 2 and 6 must be identical across the three arms, byte for byte in the case of step 6. Steps 3 through 5 are the treatment. Step 1 is shared code.

Two consequences follow. First, the server pipeline does little work at initial load, because the default state has no sort or filter. By design, arm differences in server time should come from mapping and rendering. Second, the current `Server-Timing` value in `apps/server.js` starts its timer before `readFileSync` and `JSON.parse`, so it reports load plus render, not the "renderToString duration" the preregistration names (line 183). Report separate entries: `load`, `map`, `render`, and `serialize`. Make `map` plus `render` the H10 outcome, and state that choice.

### A4. The tension: the same tree runs during hydration

With `hydrateRoot`, the client renders its component tree and React checks the result against the server's DOM. If an arm's server tree were also its client tree, as in the current isomorphic setup, Arm 9's providers and hooks and Arm 8's classes would ship to the browser, and the client would differ by construction. That breaks H10's premise.

The way out is that React compares markup, not components. A server tree built from different components can still hydrate cleanly under a different client tree, provided the HTML is identical. That gives the author three options.

**Option A (recommended): a server-only render tree per arm and one shared client.**

- Each arm's `server.jsx` imports only its own server tree and renders it with `renderToString`.
- Each arm's `index.jsx` imports the same shared client component, derived from Arm 1, and calls `hydrateRoot` with `window.__SSR_DATA__`.
- Server-only modules never enter the client import graph. `apps/build.js` already builds `index.jsx` and `server.jsx` as separate entries, so no build change is needed beyond the imports.
- Hooks such as `useContext`, `useMemo`, and `useReducer` work under `renderToString`; effects do not run. Arm 9's server tree can therefore keep its conventional patterns.
- Arm 7's server tree can follow rule 1 (no hooks) exactly. This resolves the rule 1 tension flagged in Section 2.

**Option B: one isomorphic tree with server-only modules injected through props.** The client tree stays Arm 1's, and `server.jsx` passes precomputed values in. This is weaker. Any provider or hook that lives in the tree ships to the client, so the treatment leaks. Use it only if Option A proves impractical.

**Option C: `renderToStaticMarkup` with no hydration.** This is rejected, because it changes the rendering mode under study.

**Validity note.** A conventional React team would normally hydrate the same tree it renders on the server. A server-only Arm 9 tree is therefore less typical than an isomorphic one. The author has chosen isolation over typicality; the paper should say so in its limitations section.

### A5. Keeping the client identical in practice

1. **One client source file per archetype.** Move Arm 1's `App.jsx` to a shared path, for example `apps/<archetype>/shared-client/App.jsx`, with one change: an optional `initialData` prop, as Arm 9's table already has. Arm 1 imports it and fetches as before. Arms 7, 8, and 9 import the same file. The folders for Arms 7, 8, and 9 then hold only server code plus a three-line `index.jsx`.
2. **Identical entry files.** The `index.jsx` files for Arms 7, 8, and 9 should be byte-identical:

   ```jsx
   import { hydrateRoot } from 'react-dom/client';
   import App from '../shared-client/App.jsx';

   hydrateRoot(document.getElementById('root'), <App initialData={window.__SSR_DATA__} />);
   ```

3. **A bundle-hash check in CI.** Build the three client bundles and assert equal SHA-256 hashes. Use esbuild's metafile to assert that no file under an arm folder appears in the client graph.
4. **A markup parity check.** For each archetype and size, assert that each arm's server HTML equals `renderToString(<App initialData={data} />)` from the shared client component. The shared client is the golden reference.
5. **A hydration check.** Hydrate in a real browser with `onRecoverableError` set to throw, and fail the run on any hydration warning.
6. **Text-node structure must match Arm 1.** Arm 1 writes `Page {currentPage} of {totalPages}` (line 257) and `{selCount} of {filteredSorted.length} selected` (line 186). React emits `<!-- -->` separators between those text parts. Each server tree must write the same JSX text structure. This reverses the "single text node" advice in S2: server trees must copy Arm 1's text layout, not improve it.
7. **No `useId`, `Suspense`, or `lazy` in a server tree** unless the shared client has the same. They emit tree-dependent IDs or comment markers. Arm 1 uses none of them.
8. **Plain JSON on the wire.** Arms 8 and 9 must serialize the raw rows, not class instances, to `__SSR_DATA__`. The client then receives the same bytes in all three arms. This reverses S5's advice to map JSON to classes in `index.jsx`.
9. **Pin the locale.** Arm 1 formats salary with `toLocaleString()` and no locale argument. The server render uses Node's default locale, and the browser uses its own. Change the shared client to `toLocaleString('en-US')`, or launch Chrome with `--lang=en-US`. The first is safer, because it also fixes the CSR arms.

### A6. Revised guidance for Arms 8 and 9

**Stays, server tree only:**

- Arm 8: per-row domain classes, `DashboardData`, prototype methods, and mapping at the server boundary. `Section 5`'s Employee example still applies, inside `server.jsx`'s import graph.
- Arm 9: `DataProvider` and `FilterProvider` with initial state from the request, custom hooks (`useFilteredData`, `useSortedData`, `usePagination`, `useDashboardSummary`) that read context and compute, switch-based `CellContent`, `ErrorBoundary`, `PageLayout`, `DataLoader`, and component decomposition.
- Both: stable keys. Keys do not appear in the HTML, so they are harmless.

**Changes for a server-only tree:**

- `useMemo`, `useCallback`, `memo`, and context-value memoization do nothing useful in a single server render. A senior developer writing a server-only tree would leave them out. Their cost is negligible either way; I recommend omitting them and saying so in the arm's README.
- `useReducer` has no transitions to manage on the server. Replace it with plain derived values from context.
- `ErrorBoundary` does not catch errors during `renderToString`. Keep it if the spec's five patterns require the wrapper, but handle render errors in the route with `try` and `catch`.

**Removed from the Arm 8 and 9 clients:**

- `memo(TableRow)`, local edit state in `EditableCell`, `useCallback` stabilization, split contexts for re-render control, the reducer, `useDebouncedCallback`, client-side domain classes, and the fetch fallback.
- The hoisted collator and false-first booleans in client code (S1). The client sort is whatever Arm 1 does.

If the author wants any client performance change, make it in the shared client. It then reaches Arms 1, 7, 8, and 9 together. Note that it also changes Arm 1's standing against CSR Arms 2 through 5 unless the same change goes into them.

**Arm 7:** revert its client to the shared client. Its `lib.js` becomes a server-only module used by its server tree. Its pure-function server tree is now the cleanest expression of rule 1.

### A7. SQLite for Arms 6, 10, and 11

**Precondition for Arm 6.** The code in `apps/table/6-react-ssr-stateless-domx` hydrates a React app and sorts on the client (`localeCompare` at line 161, fetch fallback at line 135). The spec (line 232) describes React on the server only, with htmx, genX, and domx on the client. Arm 6 must be rebuilt to the spec before SQLite applies to it.

#### A7.1 One file from the committed data

- Build from the committed `data/<archetype>/<rows>.json`. Do not regenerate. `generate-data.js` lines 122 through 126 build dates with `new Date(startYear, 0, 1)` in local time and print them with `toISOString()` in UTC, so output can shift by a day with the machine's time zone. Fix it with `Date.UTC` for future regeneration, and run any build with `TZ=UTC` anyway.
- Write one file per size, `data/sqlite/<rows>.sqlite`, with one table per archetype, or one file per archetype and size. Either works; pick one.
- Insert in `id` order in one transaction, then run `ANALYZE` and `VACUUM`, and set `journal_mode=DELETE` on the stored file.
- Write a manifest with the SHA-256 of each source JSON file, the SQLite version used, and the SHA-256 of a canonical dump (`SELECT` every row in `id` order, serialized as JSON). File bytes can vary by SQLite version; the dump hash should not.
- Assert in the build that all text is ASCII. The NOCASE rule below depends on it.

#### A7.2 Schema and indexes

Keep one `schema.sql` that both runtimes ship. Keep the JSON field names as column names, so rows map one to one onto the templates with no rename layer:

```sql
CREATE TABLE employees (
  id         INTEGER PRIMARY KEY,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  department TEXT    NOT NULL,
  hireDate   TEXT    NOT NULL CHECK (hireDate GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  salary     INTEGER NOT NULL,
  active     INTEGER NOT NULL CHECK (active IN (0, 1))
) STRICT;

-- One pair per sortable column; text columns use NOCASE.
CREATE INDEX employees_name_asc  ON employees (name COLLATE NOCASE ASC,  id);
CREATE INDEX employees_name_desc ON employees (name COLLATE NOCASE DESC, id);
-- ... same for email and department; numeric and date columns without COLLATE.
```

- Dashboard ids are text (`ORD-000001`); use `id TEXT PRIMARY KEY`. They are zero-padded, so binary order equals numeric order.
- Store booleans as 0 and 1, and convert to `true` and `false` in the row mapper in both runtimes.
- **Money.** Dashboard `amount` and grid `q1` through `q4` are two-decimal floats. SQLite 3.43 and later sum floats with compensated summation, while a JavaScript `reduce` and Python's `sum` add naively. Totals can differ in the last bits and, rarely, in the printed cents. Either store integer cents (`amount_cents`) in SQLite and compute every total in cents in every arm, client included, or specify the rounding rule and verify it. I recommend cents. Note that Python's `round` rounds half to even and `Math.round` rounds half up; with two-decimal inputs, `x * 100` is never exactly on a half, so both give the same integer.

On this box, `EXPLAIN QUERY PLAN` showed that the mixed-direction index made `ORDER BY name COLLATE NOCASE DESC, id ASC LIMIT 25` a covering-index scan.

#### A7.3 Opening the database the same way in Node and Python

| Setting | Node (better-sqlite3) | Python (`sqlite3`) |
|---|---|---|
| Read-only open | `new Database(path, { readonly: true, fileMustExist: true })` | `sqlite3.connect(f"file:{path}?mode=ro", uri=True, check_same_thread=False)` |
| Transactions | explicit `db.transaction(...)` | `autocommit=True` (Python 3.12 and later) or `isolation_level=None`, then explicit `BEGIN` |
| PRAGMAs | `cache_size=-65536`, `temp_store=MEMORY`, `mmap_size=268435456`, `query_only=ON` on read connections | same |
| Prepared statements | prepare every statement once at startup | same SQL strings; the statement cache (`cached_statements`, default 128) reuses them |
| Row shape | plain object, then map `active` to boolean | `row_factory` returning a dict, then the same mapping |

- `node:sqlite` is an alternative to better-sqlite3 (`new DatabaseSync(path, { readOnly: true })`), but it needs Node 22.13 or later to run without a flag. The box has Node 20.19.2.
- better-sqlite3 bundles its own SQLite; Python links the system library (3.46.1 on this box). Record `sqlite_version()` from both at startup, pin them to the same minor version if possible, and assert in CI that `EXPLAIN QUERY PLAN` output matches across runtimes.
- FastAPI runs `async def` handlers on the event loop, and `sqlite3` calls block it. Node's driver is synchronous too. That is a fair match for sequential benchmark runs; say so.

#### A7.4 Sort rule, collation, and ties

No custom collation works in all three drivers. better-sqlite3 declined to add a collation API (issue 646, closed as won't-fix, because a collation callback cannot report errors). `node:sqlite` exposes `function` and `aggregate` but no collation; an open feature request (Node issue 63316) asks for one. Only Python has `create_collation`. A registered collation that matches ICU's `localeCompare` is therefore not available on the Node side.

ICU order also cannot come from SQLite's built-in collations. On the table data, `localeCompare` and lowercase code-point order agree on `name`, `department`, and `hireDate` but not on `email`. The first difference is at sorted index 4,200 (`anthony.brown5696@example.com` against `anthony.brown56969@example.com`), because ICU puts `@` before digits and ASCII does not.

So change the canonical rule for every arm:

- **Text:** ASCII case-insensitive code-point order. In SQLite, `COLLATE NOCASE`. In JavaScript, compare `a.toLowerCase()` and `b.toLowerCase()` with `<` and `>`, not `localeCompare`.
- **Ties:** ascending `id` in both directions. This matters: 97,500 of the 100,000 table names are duplicates. Arm 1's current "negate the comparator" approach keeps ties in data order, which is `id` order, so an explicit `id` tiebreak preserves today's tie behavior while making it explicit.
- **Booleans:** keep Arm 1's true-first ascending order; in SQL, ascending maps to `active DESC, id ASC`.
- **Dates:** ISO text, compared as text.

A precomputed lowercase key column (`name_key`) sorted with the default binary collation is an equivalent alternative if the author prefers not to rely on NOCASE. It costs storage and must be updated on every edit.

**Verification.** I built the table at 100,000 rows in SQLite on the box and compared page 3 (rows 51 through 75) for all six columns in both directions against a JavaScript reference using the rule above. All 12 matched. The script is in `/workspace/scratch/sqlite/`.

#### A7.5 Filter semantics

Arm 1 filters with `row[col].toLowerCase().includes(text.toLowerCase())` over name, email, and department. Use `instr` in SQL, not `LIKE`:

```sql
WHERE instr(lower(name), lower(:q)) > 0
   OR instr(lower(email), lower(:q)) > 0
   OR instr(lower(department), lower(:q)) > 0
```

- `LIKE` treats `%` and `_` as wildcards, so typed text containing them would match differently unless escaped with `ESCAPE '\'`.
- Lowercase the query inside SQL, so both runtimes pass the raw string and Python's Unicode `lower()` and JavaScript's `toLowerCase()` never enter the comparison.
- SQLite's `lower()` folds ASCII only. That equals the client's folding on this ASCII data.
- On the box, `instr` and `LIKE '%son%'` both returned 14,019 rows, the same as the JavaScript reference.
- The filter scans every row; no index helps a substring search. That cost is the same in both runtimes.

For the dashboard, use equality for category and status, and inclusive `date BETWEEN :from AND :to` on ISO text, matching the client's bounds.

#### A7.6 Paging

Clamp the page before querying, as the current `compute_view` and `computeView` do:

```sql
SELECT count(*) AS n FROM employees WHERE <filter>;
SELECT id, name, email, department, hireDate, salary, active
FROM employees WHERE <filter>
ORDER BY <whitelisted column and direction>, id ASC
LIMIT 25 OFFSET :offset;
```

`ORDER BY` cannot take a bound parameter. Build a fixed map of the allowed column and direction pairs at startup in both runtimes and prepare one statement per pair. That blocks injection and gives both runtimes the same statement reuse. Use two statements, or `count(*) OVER ()` in one, but use the same choice in both runtimes.

#### A7.7 Mutations and reset

The table supports inline edit and delete; the grid supports cell edit and bulk fill.

- **Per-run working copy.** Before each run, the harness calls a reset endpoint, for example `POST /__bench/reset?archetype=table&rows=100000`. The server closes its write connection, copies the pristine file to `run/<archetype>-<rows>.sqlite`, reopens it read-write with the shared PRAGMAs plus `journal_mode=WAL` and `synchronous=OFF` (a benchmark, not a durable store; state it), and runs one untimed warm-up query. Node and Python run the same steps.
- Read-only archetypes (form, dashboard, browser) open the pristine file with `mode=ro` and `immutable=1` and need no reset.
- The current design keeps one global dataset per server process and resets it on each full-page render. The per-run copy replaces that. Runs must stay sequential, or each run needs its own file keyed by a run ID.
- **Edits:** `UPDATE employees SET <whitelisted column> = ? WHERE id = ?`.
- **Deletes:** `DELETE FROM employees WHERE id IN (SELECT value FROM json_each(?))`, with a JSON array of integers, inside one transaction.
- **One parse rule for salary in every arm.** Arm 1 uses `parseInt(value) || old`; Arm 11 uses `int(value)` and keeps the old value on `ValueError`. They differ: `"12abc"` gives 12 in JavaScript and the old value in Python, and `"0"` gives the old value in JavaScript and 0 in Python. Define one rule, such as "digits only, else keep the old value," and apply it in the shared client and in both server runtimes.

#### A7.8 The ID type fix

Both table arms compare a string ID from the request with a numeric row ID, so edits and deletes silently fail:

- Arm 10, `apps/table/10-htmx-ejs/server.js` lines 146 through 159: `const id = req.query.id;` then `tableData.find(r => r.id === id)`. Inline edit always returns 404 or does nothing.
- Arm 11, `apps/table/11-fastapi-honest-htmx/routes.py` line 152 and `lib.py` line 97 compare `r["id"] == row_id` with a string `row_id`.
- Arm 11, `lib.py` line 91: `r["id"] not in selected`, where `selected` has string keys from `json.loads`. Delete never removes a row.

The grid arms already parse with `parseInt` and `int`. Parse IDs at the route boundary in every server arm: integers for table, browser, grid, and form; strings for dashboard. Carry selection as a JSON array of numbers. SQLite's type affinity would make `id = '5'` match an integer column, but parse explicitly anyway, so in-app comparisons and Python sets behave correctly.

#### A7.9 What the preregistration must say

Add a paragraph like this to the methods and amend the data-files line:

> Server-driven arms (6, 10, and 11) query a SQLite file per interaction and return one page of results. Client-side arms (1 through 5) and hydration arms (7, 8, and 9) receive the full dataset and filter, sort, and page in memory in the browser. The data-access strategy is part of the rendering-mode variable, not a separate factor, because production server-rendered applications page from a database. Comparisons H6, H7, H8, and H13 therefore measure rendering mode including data access. H12 compares Node and Python on the same SQLite file and schema, so driver differences are part of the runtime comparison. All SQLite files are built from the frozen JSON files by one script; the manifest records source hashes, SQLite versions, and a canonical dump hash. Server-Timing reports query time and render time separately so readers can separate them.

Also decide whether Arms 7, 8, and 9 load their initial data from the same SQLite file (`SELECT *` in `id` order) or from JSON. I recommend SQLite, so all server arms share one data source. Either way, the three must use the same source. If the preregistration is already registered, file this as a dated amendment before data collection.

**Code sketches.** These are illustrations, not tested against the harness.

Node (better-sqlite3):

```js
import Database from 'better-sqlite3';

const SORTS = {
  name: 'name COLLATE NOCASE', email: 'email COLLATE NOCASE',
  department: 'department COLLATE NOCASE', hireDate: 'hireDate', salary: 'salary',
};
const FILTER = `(:q = '' OR instr(lower(name), lower(:q)) > 0
  OR instr(lower(email), lower(:q)) > 0 OR instr(lower(department), lower(:q)) > 0)`;

export function openTable(path) {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  for (const p of ['cache_size = -65536', 'temp_store = MEMORY', 'mmap_size = 268435456', 'query_only = ON']) db.pragma(p);
  const count = db.prepare(`SELECT count(*) AS n FROM employees WHERE ${FILTER}`);
  const pages = new Map();
  const orders = { ...Object.fromEntries(Object.entries(SORTS).flatMap(([k, e]) =>
    [[`${k}:asc`, `${e} ASC`], [`${k}:desc`, `${e} DESC`]])),
    'active:asc': 'active DESC', 'active:desc': 'active ASC', ':': 'id ASC' };
  for (const [key, order] of Object.entries(orders)) {
    pages.set(key, db.prepare(`SELECT * FROM employees WHERE ${FILTER}
      ORDER BY ${order}, id ASC LIMIT 25 OFFSET :offset`));
  }
  return function page({ q = '', col = '', dir = '', page = 1 }) {
    const total = count.get({ q }).n;
    const last = Math.max(1, Math.ceil(total / 25));
    const p = Math.min(Math.max(1, page), last);
    const stmt = pages.get(`${col}:${col ? dir : ''}`) ?? pages.get(':');
    const rows = stmt.all({ q, offset: (p - 1) * 25 }).map(r => ({ ...r, active: r.active === 1 }));
    return { rows, page: p, totalPages: last, total };
  };
}
```

Python (`sqlite3`):

```python
import sqlite3

SORTS = {"name": "name COLLATE NOCASE", "email": "email COLLATE NOCASE",
         "department": "department COLLATE NOCASE", "hireDate": "hireDate", "salary": "salary"}
ORDERS = {f"{k}:{d}": f"{e} {d.upper()}" for k, e in SORTS.items() for d in ("asc", "desc")}
ORDERS |= {"active:asc": "active DESC", "active:desc": "active ASC", ":": "id ASC"}
FILTER = """(:q = '' OR instr(lower(name), lower(:q)) > 0
  OR instr(lower(email), lower(:q)) > 0 OR instr(lower(department), lower(:q)) > 0)"""
PAGE_SQL = {k: f"SELECT * FROM employees WHERE {FILTER} ORDER BY {o}, id ASC LIMIT 25 OFFSET :offset"
            for k, o in ORDERS.items()}


def open_table(path: str) -> sqlite3.Connection:
    db = sqlite3.connect(f"file:{path}?mode=ro", uri=True, check_same_thread=False, autocommit=True)
    for p in ("cache_size = -65536", "temp_store = MEMORY", "mmap_size = 268435456", "query_only = ON"):
        db.execute(f"PRAGMA {p}")
    db.row_factory = lambda cur, row: {c[0]: v for c, v in zip(cur.description, row)}
    return db


def page(db: sqlite3.Connection, q: str = "", col: str = "", dir: str = "", page: int = 1) -> dict:
    total = db.execute(f"SELECT count(*) AS n FROM employees WHERE {FILTER}", {"q": q}).fetchone()["n"]
    last = max(1, -(-total // 25))
    p = min(max(1, page), last)
    sql = PAGE_SQL.get(f"{col}:{dir if col else ''}", PAGE_SQL[":"])
    rows = [{**r, "active": r["active"] == 1} for r in db.execute(sql, {"q": q, "offset": (p - 1) * 25})]
    return {"rows": rows, "page": p, "total_pages": last, "total": total}
```

### A8. H10 restated

Proposed text:

> **H10.** Server response time (Server-Timing `map` plus `render`) will differ among Arms 7, 8, and 9, with Arm 8 predicted above Arm 7 and Arm 9 predicted above Arm 8 [keep the existing direction and magnitude]. Arms 7, 8, and 9 ship the same client bundle, verified by identical content hashes, and their server HTML is byte-identical, verified per archetype and size. Client-side metrics are therefore expected to be equivalent; we report them as a manipulation check and test equivalence with two one-sided tests at a margin of ±[X] ms for INP and TTI.

A Kruskal-Wallis test that finds no difference is not evidence of equivalence, so use an equivalence test or drop the client claim to a manipulation check. Also correct two stale spec passages: line 21 (old arm numbering, and "the client-side integration differs between all three SSR arms") and line 61 (fragment rendering for interactions, which contradicts hydration with client-side interactions).

### A9. Revised IN and OUT tables

These supersede Sections 10.1 and 10.2 where they differ.

#### A9.1 IN

| Item | Where it goes | Arms | Note |
|---|---|---|---|
| Shared client component from Arm 1, plus optional `initialData` | shared client | 1, 7, 8, 9 | one source file; bundle hashes equal for 7, 8, and 9 |
| Identical `index.jsx` calling `hydrateRoot` | client entry | 7, 8, 9 | byte-identical |
| Canonical sort: ASCII case-insensitive, `id` ties | every arm | all | replaces S1's collator rule; matches SQLite NOCASE |
| `toLocaleString('en-US')` and cents-based totals | every arm | all | removes locale and float drift |
| One salary parse rule | every arm | all | digits only, else keep old value |
| Domain classes and mapping | server tree | 8, 9 | raw JSON still goes to `__SSR_DATA__` |
| Providers, custom hooks, switch `CellContent` | server tree | 9 | no memoization needed |
| `ErrorBoundary`, `PageLayout`, `DataLoader` | server tree | 9 | route-level `try` and `catch` handles render errors |
| Pure-function tree with no hooks | server tree | 7 | Arm 7's `lib.js` becomes server-only |
| Server tree copies Arm 1's text-node layout | server tree | 7, 8, 9 | required for hydration |
| Split `Server-Timing`: `load`, `map`, `render`, `serialize` | route | 7, 8, 9 | H10 outcome is `map` plus `render` |
| Bundle-hash, markup-parity, and hydration checks | CI | 7, 8, 9 | fail on any hydration warning |
| SQLite file, schema, indexes, and manifest | data | 6, 10, 11 (and 7 to 9 for initial load) | built from committed JSON |
| `instr` filter, whitelisted `ORDER BY`, `LIMIT` and `OFFSET` | server | 6, 10, 11 | same SQL text in Node and Python |
| Matching driver settings and recorded SQLite versions | server | 6, 10, 11 | see the A7.3 table |
| Per-run working copy and reset endpoint | harness and server | table and grid arms 6, 10, 11 | replaces module-level state |
| ID parsing at the route boundary | server | 10, 11 (and 6) | fixes edit and delete |
| Preregistration amendments for H10, data access, and data files | prereg | — | before data collection |

#### A9.2 OUT

| Item | Previous status | Now | Reason |
|---|---|---|---|
| `memo(TableRow)` | IN for Arm 9 client | OUT | client must equal Arm 1; useless in a single server render |
| Local edit state in `EditableCell` | IN for Arms 8 and 9 client | OUT | client change |
| `useCallback` and context-value memoization | IN for Arm 9 client | OUT | client change; no effect on server |
| `useReducer` for table state | IN for Arm 9 | OUT | no transitions on the server |
| `useDebouncedCallback` | IN for Arm 9 client | OUT | client concern |
| Client-side domain classes (mapping in `index.jsx`) | IN under S5 | OUT | client receives plain JSON |
| Fetch fallback in SSR arms | present in Arm 9 | OUT for 7, 8, 9 | data always comes from `__SSR_DATA__` |
| Hoisted collator in client code (Rule B) | IN | OUT | client sort is the shared client's canonical rule |
| `Intl.Collator` sensitivity-base rule (S1) | IN | OUT | SQLite cannot reproduce it; replaced by NOCASE rule |
| "Single text node" cleanup (S2) | IN | OUT | server trees must copy Arm 1's text layout |
| Any client refactor specific to Arms 7, 8, or 9 | — | OUT | violates the client-identical rule |
| Custom SQLite collation | — | OUT | not available in better-sqlite3 or `node:sqlite` |
| `LIKE` for substring filter | — | OUT | wildcard semantics; use `instr` |
| `renderToStaticMarkup` with no hydration | — | OUT | changes the rendering mode |

### A10. Limits of this addendum

- The SQLite check covered the table archetype at 100,000 rows, page 3 only, in Python's `sqlite3` with SQLite 3.46.1. I did not run better-sqlite3 or `node:sqlite`; Node 20 on the box lacks `node:sqlite`.
- I did not build the shared client or the server-only trees, so the markup-parity and hydration checks in A5 are recommendations, not results.
- The diff counts in A2 are raw changed lines, which overstate formatting-only differences.
- Nothing in the repository or on the user's computer was changed. The scratch build and query scripts are under `/workspace/scratch/sqlite/` on the box.
