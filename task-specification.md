# Task specification: matched implementation benchmark

Version 0.2 · Oct 29, 2026

This document defines the functional requirements for each benchmark application archetype. All arms build to this specification. No implementation may add features beyond what is listed here. This document is frozen at preregistration.

## General constraints (all archetypes)

All arms use the same CSS (a shared stylesheet or Tailwind utility classes, chosen before implementation and applied uniformly). Visual appearance is not under study and must not differ between arms.

No third-party UI component libraries (Material UI, Ant Design, Chakra). Components are written from scratch so the state wiring is visible and auditable.

### CSR arms (1-5)

Each application is a single-page React 18 application. Only the state management layer differs. No server-side rendering. Each application fetches its data from a static JSON file served locally. The JSON file is identical across arms and payload sizes.

### SSR arms (6-9)

Arms 6, 7, 8, and 9 use an Express.js server (Node.js 22 or later, declared in `engines` in `apps/package.json`; CI runs Node.js 22, set in `.nvmrc`) that renders HTML with React's `renderToString`. Arms 7, 8, and 9 read the same static JSON files as the CSR arms and send the full dataset to the client. Arm 6 reads one page at a time from the SQLite files with `LIMIT`/`OFFSET`, the same data access as Arms 10 and 11.

Arm 6 and Arm 7 both write their server-side React components to the Honest Code constraint below. Arm 8 follows the Honest Code constraint except for domain model classes. Arm 9 uses conventional React patterns. Arms 7, 8, and 9 hydrate one shared client (identical to Arm 1 after hydration), so their client bundles are identical. Arm 6 alone has a different client: stateless-domx hooks that page from the server.

### htmx arm (10)

Arm 10 uses Express.js with EJS templates. The server renders HTML fragments; htmx on the client handles interactions and fragment swaps. No client-side JavaScript framework.

### FastAPI arm (11)

Arm 11 uses a Python FastAPI server with Jinja2 templates, htmx for interactions, and genX + domx for client-side formatting and DOM state observation. The server code follows Honest Code principles.

The server does not maintain session state. Each request carries the current UI state (filter values, sort direction, page number) as query parameters or form data. The server filters/sorts/paginates the dataset, renders an HTML fragment with Jinja2, and returns it.

#### Honest Code constraint (server-side code)

The server code for Arms 6 and 7 follows the Honest Code principles. These are not novel techniques: pure functions, flat composition, and plain data are established practices. The book collects them into a named discipline and applies them to mainstream web development, where the conventional patterns (provider trees, domain classes, deep component hierarchies) remain the default. Five rules govern the Express routes and React components that run on the server in these two arms:

1. **Components are pure functions.** Every React component is a function that takes props and returns JSX. No class components, no hooks, no side effects inside a component body. A component that needs data receives it as a prop; it never fetches, reads, or subscribes.
2. **Data is plain objects.** The JSON read from the data file is the object the component receives. No domain classes, no DTO conversions, no constructor chains. The shape the database returns is the shape the component renders.
3. **Flat composition.** No provider trees, no wrapper component hierarchies. The Express route calls a flat list of functions: parse the request, filter the dataset, sort, paginate, render. Each function takes data in and returns data out. A new concern (e.g., logging) is a new function added to the list, not a wrapper around the existing ones.
4. **Config tables replace conditionals.** Where a component would branch on a value (e.g., rendering different widgets by type), a plain object maps the value to its renderer. No if/else chains, no switch statements dispatching on type.
5. **I/O at the boundary.** The Express route handler is the only impure function. It reads the data file, calls the pure pipeline, calls `renderToString`, and sends the response. The React components and the filter/sort/paginate functions never touch I/O.

The React server components of Arms 6 and 7 follow all five rules. Arm 8 follows four of the five (see below). Arm 11 applies the same principles in Python. Arms 9 and 10 and the CSR arms are not constrained by these rules.

#### Conventional React constraint (Arms 8 and 9 server-side code)

Arm 8 changes one thing relative to Arm 7: it wraps raw JSON in domain model classes before rendering. Arm 9 changes all five patterns at once. This two-arm design answers the question a reviewer will ask: which pattern caused the gap?

#### Arm 8: Honest Code + domain classes

Arm 8 follows the Honest Code constraint for four of the five rules (pure function components, flat composition, config tables, I/O at the boundary). It breaks the "data is plain objects" rule: raw JSON is transformed into typed domain objects before the components receive it. An `Employee` class has methods like `fullName()` and `isActive()`. A `DashboardData` class computes aggregates. Components receive class instances, not plain objects.

This isolates the per-object overhead. Domain class instantiation scales linearly with row count. If Arm 8 is slower than Arm 7, domain classes are the driver. If Arm 8 matches Arm 7, they are not.

#### Arm 9: full conventional React

Arm 9's server components are written the way a typical React team would write them, following the patterns that the React documentation, popular tutorials, and library starter templates recommend. Five patterns define "conventional" for this experiment:

1. **Context providers for shared data.** Filter state, theme, and data access are provided through React Context. Components read from context via `useContext`. The component tree wraps inward through providers: `<DataProvider>` → `<FilterProvider>` → `<ThemeProvider>` → `<Layout>` → content.
2. **Custom hooks for data transformation.** Components call hooks like `useFilteredData(filters)` and `useSortedData(data, sortConfig)` that compute derived state. The transformation logic lives inside the hook, not in a standalone function.
3. **Domain model classes.** Same as Arm 8: raw JSON is transformed into typed domain objects before rendering.
4. **Conditional rendering via branching.** Components use if/else or switch statements to select what to render based on type, status, or mode. A dashboard widget renders differently based on its `widgetType` prop through a switch statement, not a lookup table.
5. **Component hierarchy for cross-cutting concerns.** Layout, error handling, and loading states are handled by wrapper components that nest inward. A page component extends a layout that wraps an error boundary that wraps a data loader.

All three sets of server components (Arms 7, 8, 9) produce identical HTML output for the same inputs. The difference is in the code structure that produces it.

Arms 7, 8, and 9 use React `renderToString` on the server for the initial page, then hydrate on the client. After hydration, interactions are handled client-side with React state (identical to Arm 1). The comparison between Arms 7, 8, and 9 is a three-point ablation of server-side code style: Honest Code (Arm 7), Honest Code with domain classes (Arm 8), and all five conventional patterns (Arm 9). The client-side code after hydration is identical across all three.

Arm 6 uses React `renderToString` on the server for the initial page. After hydration, client-side interactions use stateless-domx hooks (DOM as state) instead of React useState.

Arms 10 and 11 do not hydrate. All interactions are handled by the server: htmx sends a request, the server renders an HTML fragment, and htmx swaps it into the page.

Every htmx request carries the whole page state in hidden inputs. A small shared script, `apps/lib/htmx-replay.js`, saves the last successful request in local storage and replays it once after a reload, so the sort, filters, page, selection, and form step survive a refresh; deletes, edits, and submits are never replayed.

For initial page load, all server-rendered arms render the full page. Fragment granularity for Arms 10 and 11 is defined per archetype below.

## Archetype 1: multi-step form

A four-step checkout form: contact information, shipping address, account type, and review.

### Requirements

1. **Step navigation.** Forward and back buttons. The forward button is disabled until the current step's required fields are valid. The back button preserves entered data.
2. **Fields per step.**
   - Step 1 (contact): first name, last name, email, phone. All required.
   - Step 2 (shipping): street, city, state (dropdown, 50 US states), zip, country (dropdown, 10 countries). All required.
   - Step 3 (account): account type (individual or business). Required.
   - Step 4 (review): read-only summary of all entered values. A "place order" button that logs the collected state to the console as JSON.
3. **Conditional fields.** When account type is "business," step 3 shows three additional fields: company name (required), tax ID (required), and purchase order number (optional).
4. **Validation.** Inline, on blur. Email must match a simple regex. Phone must be 10 digits. Zip must be 5 digits. Error messages appear below the field.
5. **Progress indicator.** A bar or stepper showing which step the user is on.

### State under management

Current step, all field values, all validation states, conditional field visibility.

## Archetype 2: data table

A table of employee records with client-side sort, filter, pagination, inline edit, and row selection.

### Requirements

1. **Columns.** Name (string), email (string), department (string, one of 8 values), hire date (ISO date), salary (integer), active (boolean).
2. **Sorting.** Click a column header to sort ascending; click again for descending; click a third time to clear. One column sorted at a time.
3. **Filtering.** A single text input above the table. Filters all string columns (name, email, department) with case-insensitive substring match. Debounce at 300ms.
4. **Pagination.** 25 rows per page. Previous / next buttons. Page indicator ("Page 3 of 12"). Filtering resets to page 1.
5. **Inline editing.** Double-click a name or salary cell to edit in place. Press Enter to commit, Escape to cancel. The table re-sorts if the edited column is the current sort column.
6. **Row selection.** Checkbox in the first column. A "select all" checkbox in the header that toggles all visible (filtered, current page) rows. A count above the table: "3 of 250 selected."
7. **Bulk action.** A "delete selected" button that removes the selected rows from the dataset. No confirmation dialog.

### State under management

Sort column and direction, filter text, current page, per-row selection, edited cell identity and pending value, the dataset itself (after deletions).

## Archetype 3: dashboard

A dashboard with a shared filter bar, four summary cards, and an orders table. The cards and the table respond to the same filters.

### Requirements

1. **Filter bar.** Start and end date inputs, a category dropdown (one of 6 values, plus "All"), and a status dropdown (one of 5 values, plus "All"). A filter takes effect as soon as its value changes. A filter change returns the table to page 1.
2. **Summary cards.** Four cards show total orders (count), total revenue (sum), average order value (mean), and unique customers (count of distinct customers). They are computed from the filtered set.
3. **Orders table.** The filtered orders, with columns for order ID, date, customer, category, amount, status, and item count. Click a column header to sort ascending; click again for descending; click a third time to clear. One column is sorted at a time. Ties are broken by ascending ID. No inline edit.
4. **Pagination.** 25 rows per page. Previous and next buttons. A page indicator reads "Page 3 of 12."
5. **Auto-refresh.** Every 60 seconds, the dashboard re-reads its data and updates the cards and the table. A line above the cards reads "Last updated 19:03:12 UTC." A refresh keeps the filters, the sort, and the page.
6. **Refresh control.** The page-load query `refresh=N` sets the interval in seconds, from 0 to 3600. The default is 60, and 0 turns the timer off. Any other value returns HTTP 400. A `dashboard-refresh` event dispatched on `document.body` starts a refresh at once. The harness loads the page with `refresh=0` and fires the event itself, so every run sees the same refreshes.

### State under management

Filter values, sort column and direction, current page, computed aggregations, refresh timer, last-updated timestamp.

## Archetype 4: large dataset browser

A list of records, designed to test state management under large payloads.

### Requirements

1. **Columns.** Name (string), status (one of 5 values), created date (ISO date), and value (float). Each record also has an integer ID, which the row carries and the detail panel shows.
2. **Search.** A text input that filters by name with case-insensitive substring match, debounced at 300ms. A search returns the list to page 1.
3. **Status filter.** A row of buttons: "All" and one for each status. Choosing one filters the list and returns it to page 1.
4. **Count.** The number of matching records appears beside the status buttons: "1234 records." Number formatting may differ by arm.
5. **Sorting.** Click the name, status, created, or value header to sort ascending; click again for descending; click a third time to clear. The sort rule is the table's.
6. **Pagination.** 25 rows per page. Previous and next buttons. A page indicator reads "Page 3 of 12."
7. **Detail panel.** Click a row to show all its fields in a panel beside the list. The selected row is highlighted. A close button hides the panel.

### State under management

Search query, status filter, sort column and direction, current page, filtered set, selected row for detail.

## Archetype 5: editable grid

A spreadsheet-like grid of budget line items, designed to test the known scaling problem of editing cells in a large, non-virtualized table where changes propagate to dependent cells. Several grid libraries, including AG Grid and Handsontable, manage cell rendering outside React's normal update path to achieve acceptable performance.

### Requirements

1. **Grid layout.** A table of budget line items. No virtualization. Every row of the current page is rendered in the DOM at once.
2. **Columns.** A row checkbox, category (string, one of 12 values), description (string), Q1 amount (float, editable), Q2 amount (float, editable), Q3 amount (float, editable), Q4 amount (float, editable), annual total (computed: Q1+Q2+Q3+Q4, read-only), budget target (from the data, read-only), and variance (computed: annual total minus budget target, read-only).
3. **Editable cells.** Click a Q1-Q4 cell to edit it in place with a number input. Enter commits the edit. Escape cancels.
4. **Category filter and pagination.** A category dropdown (one of 12 values, plus "All") filters the grid and returns it to page 1. 25 rows per page. Previous and next buttons. A page indicator reads "Page 3 of 12."
5. **Computed columns.** Annual total and variance update immediately when any quarterly amount changes. These are derived values, not stored state.
6. **Category subtotals.** A subtotal row appears after each category group, showing the sum of each quarterly column and the annual total for that category. Subtotals update when any cell in the category changes.
7. **Totals row.** A row at the foot of the grid shows the sum of each quarterly column, the annual total, the budget target, and the variance over the whole filtered set, not just the current page. It updates when any cell changes.
8. **Conditional formatting.** Variance cells are green when positive, red when negative, and black when zero. Subtotal variance cells follow the same rule.
9. **Bulk fill.** Select rows with their checkboxes; a header checkbox selects or clears every row on the current page. Choose a quarter and enter a value. The button reads "Fill 20 rows." That quarter's cell in every selected row receives the value. Subtotals and the totals row update.

### State under management

Every editable cell value, every computed cell value (annual totals, variances), every subtotal row (4 quarterly sums + annual + variance per category), the totals row, the category filter, the current page, the selected cell, the rows selected for bulk fill, the chosen quarter, the pending bulk-fill value.

### Why this archetype stresses the code-style variable

A single cell edit touches one value, recomputes one annual total, one variance, one category subtotal row, and the totals row. In an implementation that passes grid state through context or props, an edit can trigger re-renders of many dependent components. We measure the actual count.

In the server-rendered arms, the server recalculates the affected subtotal and the totals row, renders the changed cells as HTML fragments, and returns them. We expect server cost to scale with changed cells rather than total cells; the benchmark measures whether this holds.

## Payload sizes

Five sizes, applied to each archetype. The data is generated once and checked into the replication package.

| Label | Row count |
|---|---|
| XS | 100 |
| S | 1,000 |
| M | 10,000 |
| L | 50,000 |
| XL | 100,000 |

The range spans three orders of magnitude. The two intermediate points (1,000 and 50,000) give the curve enough resolution to detect a crossover if one exists.

## Data generation

A single script generates all payload files for all archetypes. The script uses a seeded PRNG (seed recorded in the preregistration) so the data is reproducible. Field values are realistic but synthetic: names from a name list, emails derived from names, dates uniform-random within a range, numeric values drawn from a distribution stated in the script.

## SSR fragment boundaries (arms 6, 10, 11)

Three arms ask the server for new content after the page loads, and they ask in two ways.

Arm 6 fetches JSON. The page load renders the first page of rows on the server. After hydration, every sort, filter, page change, edit, and delete calls a JSON endpoint under `/<archetype>/6-react-ssr-stateless-domx/api`, and React renders the result on the client. An edit, delete, or bulk fill posts the change and then refetches the current page.

Arms 10 and 11 fetch HTML. Every interaction that reaches the server returns the archetype's whole `#<archetype>-content` block, and htmx swaps it in with `outerHTML`. The block holds the controls, the rows, the pagination, and the hidden inputs that carry the UI state into the next request. The one exception is opening a cell for editing in the table and the grid, which swaps only that cell for an input. Each interaction sends one request.

### Archetype 1 (form)

- **Initial load**: full page.
- **Arm 6**: step navigation and validation run on the client, as in the CSR arms. The form sends no request.
- **Arms 10 and 11**: typing in a field sends no request. Changing the account type on step 3 requests `/step`, which returns the step with the business fields shown or hidden. Next posts the fields to `/next`; the server validates the current step and returns the same step with its errors, or the next step. Back posts to `/prev`, and Submit posts to `/submit`. Each response replaces `#form-content`, progress indicator included.

### Archetype 2 (table)

- **Initial load**: full page with the first page of 25 rows.
- **Sort, filter, paginate**: Arm 6 fetches the page as JSON. Arms 10 and 11 return `#table-content`.
- **Row and header checkboxes**: Arm 6 keeps the selection in the DOM and sends no request. Arms 10 and 11 post to `/toggle` or `/toggle-all` and return `#table-content`.
- **Inline edit**: in Arms 10 and 11, a double-click requests `/edit-cell`, which swaps that cell for an input. Enter posts to `/commit-edit`, which returns `#table-content`. Arm 6 edits on the client, posts the value, and refetches the page.
- **Delete selected**: Arm 6 posts the ids and refetches. Arms 10 and 11 post to `/delete` and return `#table-content`.

### Archetype 3 (dashboard)

- **Initial load**: full page.
- **Filter, sort, or page change**: Arm 6 fetches one page as JSON and renders it on the client. Arms 10 and 11 return `#dashboard-content`, which holds the cards, the filter bar, the table, and the pagination.
- **Auto-refresh**: Arm 6 refetches the current page from its JSON endpoint. In Arms 10 and 11, a poller element outside the swapped block requests `/refresh` with the current state from the hidden inputs, and the server returns the same block. The client-side arms refetch the JSON file and recompute in the browser.

### Archetype 4 (large dataset)

- **Initial load**: full page with the first page of 25 rows.
- **Search, status filter, sort, or page change**: Arm 6 fetches the page as JSON. Arms 10 and 11 return `#browser-content`, which holds the list, the result count, and the pagination. Search waits 300 ms after the last keystroke.
- **Click row (detail panel)**: Arm 6 fetches the record from `/api/record/<id>`. Arms 10 and 11 request `/select` and return `#browser-content` with the detail panel open; `/close-detail` closes it.

### Archetype 5 (editable grid)

- **Initial load**: full page with the first page of 25 rows and the totals row. Totals cover every row that matches the category filter, not only the visible page.
- **Category filter or page change**: Arm 6 fetches the page and the totals as JSON. Arms 10 and 11 return `#grid-content`.
- **Cell edit commit**: in Arms 10 and 11, a click requests `/edit-cell`, which swaps that cell for an input, and Enter posts to `/commit-edit`, which returns `#grid-content` with the row's annual total, its variance, and the totals row recomputed. Arm 6 posts the value and refetches the page and totals.
- **Row checkboxes and bulk fill**: Arms 10 and 11 post to `/toggle`, `/toggle-all`, or `/bulk-fill` and return `#grid-content`. Arm 6 keeps the selection in the DOM, posts the bulk fill, and refetches.

## Arms summary

| Arm | Rendering | State layer | Server code style | Framework |
|---|---|---|---|---|
| 1. useState | CSR | React useState | n/a | React 18 |
| 2. Redux | CSR | Redux Toolkit | n/a | React 18 |
| 3. Zustand | CSR | Zustand | n/a | React 18 |
| 4. Signals | CSR | @preact/signals-react | n/a | React 18 |
| 5. stateless/domx | CSR | stateless + domx | n/a | React 18 |
| 6. React SSR + stateless-domx | SSR initial + CSR interactions (DOM as state) | stateless + domx | Honest Code | React 18 + Express |
| 7. React SSR + hydration | SSR initial + CSR interactions | React useState | Honest Code | React 18 + Express |
| 8. React SSR + hydration (domain classes) | SSR initial + CSR interactions | React useState | Honest Code + domain classes | React 18 + Express |
| 9. React SSR + hydration (conventional) | SSR initial + CSR interactions | React useState | Conventional React | React 18 + Express |
| 10. htmx + EJS | Server-rendered fragments | n/a (no client state) | Express routes | htmx + Express |
| 11. FastAPI + htmx + domx + genX | Server-rendered fragments | domx (DOM observation) + genX (declarative behavior) | Honest Code (Python) | htmx + FastAPI |

The experiment isolates two variables: where state lives (CSR arms 1-5, SSR+hydration arms 6-9, server-rendered arms 10-11) and how the server code is structured (Arms 7, 8, 9 form a three-point ablation from Honest Code through one conventional pattern to all five).

Arm 6 uses React `renderToString` on the server with Honest Code server components, then hydrates on the client. After hydration, client-side interactions use stateless-domx hooks (DOM as state) instead of React useState. This isolates the DATAOS pattern as the single variable against Arm 7, which uses the same server code but React useState on the client.

Arm 10 uses Express with EJS templates. The client has no React runtime, no hydration, and no component tree. htmx handles requests and fragment swaps. Client-side JS is htmx (~14KB) and the reload script.

Arm 11 uses a Python FastAPI server with Jinja2 templates. htmx handles interactions. genX handles client-side behavior declaratively through HTML attributes: fmtx for number and date formatting. domx observes DOM state. Client-side JS is htmx (~14KB) + genX (~1KB bootloader, modules loaded on demand) + domx (~2KB) + the reload script.

Arm 7 uses React `renderToString` on the server for the initial page with Honest Code server components, then hydrates on the client. After hydration, interactions are client-side (identical to Arm 1).

Arm 8 is identical to Arm 7 except the server wraps raw JSON in domain model classes before rendering. This isolates the per-object overhead of class instantiation.

Arm 9 is identical to Arm 7 except the server components follow all five conventional React patterns (context providers, custom hooks, domain model classes, conditional branching, component hierarchies). The comparison across Arms 7, 8, and 9 identifies which patterns drive the performance gap.

## Selector contract

Every arm exposes the same selectors, so one harness script per archetype drives all eleven arms. The harness scripts in `harness/src/interactions/` use only these selectors. `npm run check` in `harness/` runs every script against every arm without timing and must report all 55 arm-archetype pairs complete before registration.

| Archetype | Selectors |
|---|---|
| Form | `.form-step[data-step="N"]` for the visible step; `[data-field="firstName"]` and the other field names; `[data-role="account-type"]`, `[data-role="next-step"]`, `[data-role="prev-step"]`, `[data-role="submit"]` |
| Table | `th[data-column="name"]` and the other columns for sorting; `[data-role="filter-input"]`; `[data-action="next-page"]`; `td[data-column="name"]`, which opens an `input` editor on double-click; `[data-role="row-checkbox"]`; `[data-action="delete-selected"]` |
| Dashboard | `[data-role="date-from"]`, `[data-role="date-to"]`, `[data-role="category-filter"]`, `[data-role="status-filter"]`; `th[data-column="amount"]`; `[data-action="next-page"]`; `[data-role="page-info"]`; `[data-role="last-updated"]`, whose `datetime` attribute changes on every refresh |
| Browser | `[data-role="search-input"]`; `[data-role="status-filter"]`; `tbody tr[data-row]`; `[data-role="detail-panel"]`, `[data-role="detail-close"]`; `th[data-column="name"]`; `[data-action="next-page"]` |
| Grid | `td[data-cell="q1"]` through `q4`, which open an `input` editor on click; `[data-role="row-checkbox"]`; `[data-role="bulk-quarter"]`, `[data-role="bulk-value"]`, `[data-role="bulk-fill"]` |

Rows carry `data-row` with the record id. Text inputs that trigger a server request use the `input` event, not `keyup`, so programmatic input and typing behave the same.

Scripts wait for the network to go quiet after each step instead of sleeping for a fixed time.

## What this document does not specify

- The state management wiring inside each arm. That is the experimental variable.
- The CSS. A shared stylesheet is chosen before implementation and applied uniformly.
- The server rendering engine. Fixed as React `renderToString` across all SSR arms (specified in the SSR arms section above).
- Performance optimizations (memoization, batching, lazy loading). Each arm may apply optimizations idiomatic to its state library, within the tuning budget defined in the preregistration.
