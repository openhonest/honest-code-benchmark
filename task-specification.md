# Task specification: matched implementation benchmark

Version 0.1 (draft) · Oct 25, 2026

This document defines the functional requirements for each benchmark application archetype. All arms build to this specification. No implementation may add features beyond what is listed here. This document is frozen at preregistration.

## General constraints (all archetypes)

All arms use the same CSS (a shared stylesheet or Tailwind utility classes, chosen before implementation and applied uniformly). Visual appearance is not under study and must not differ between arms.

No third-party UI component libraries (Material UI, Ant Design, Chakra). Components are written from scratch so the state wiring is visible and auditable.

### CSR arms (1-5)

Each application is a single-page React 18 application. Only the state management layer differs. No server-side rendering. Each application fetches its data from a static JSON file served locally. The JSON file is identical across arms and payload sizes.

### SSR arms (6-8)

Arms 6-8 use an Express.js server (Node 20) that renders HTML with React's `renderToString`. The server reads from the same static JSON files as the CSR arms.

Arms 6 and 7 share one set of server-side React components and Express routes, written to the Honest Code constraint below. Arm 8 has its own server-side React components written in conventional React style (described after the Honest Code constraint). The client-side integration differs between all three SSR arms.

The server does not maintain session state. Each request carries the current UI state (filter values, sort direction, page number) as query parameters or form data. The server filters/sorts/paginates the dataset, renders an HTML fragment via `renderToString`, and returns it. This matches the architecture multicardz uses in production.

#### Honest Code constraint (server-side code)

The server code for Arms 6 and 7 follows the Honest Code principles. These are not novel techniques: pure functions, flat composition, and plain data are established practices. The book collects them into a named discipline and applies them to mainstream web development, where the conventional patterns (provider trees, domain classes, deep component hierarchies) remain the default. Five rules govern the Express routes and React components that run on the server in these two arms:

1. **Components are pure functions.** Every React component is a function that takes props and returns JSX. No class components, no hooks, no side effects inside a component body. A component that needs data receives it as a prop; it never fetches, reads, or subscribes.
2. **Data is plain objects.** The JSON read from the data file is the object the component receives. No domain classes, no DTO conversions, no constructor chains. The shape the database returns is the shape the component renders.
3. **Flat composition.** No provider trees, no wrapper component hierarchies. The Express route calls a flat list of functions: parse the request, filter the dataset, sort, paginate, render. Each function takes data in and returns data out. A new concern (e.g., logging) is a new function added to the list, not a wrapper around the existing ones.
4. **Config tables replace conditionals.** Where a component would branch on a value (e.g., rendering different widgets by type), a plain object maps the value to its renderer. No if/else chains, no switch statements dispatching on type.
5. **I/O at the boundary.** The Express route handler is the only impure function. It reads the data file, calls the pure pipeline, calls `renderToString`, and sends the response. The React components and the filter/sort/paginate functions never touch I/O.

This constraint applies to Arms 6 and 7 only. Arm 8 and the CSR arms are not constrained by these rules.

#### Conventional React constraint (Arm 8 server-side code)

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

Arms 8 and 9 both use React `renderToString` on the server for the initial page, then hydrate on the client. After hydration, interactions are client-side (identical to Arm 1 and Arm 7). The comparison between Arms 7, 8, and 9 is a three-point ablation: no conventional patterns, one pattern (domain classes), and all five patterns.

For initial page load, all SSR arms render the full page. For subsequent interactions, Arms 6-7 render only the fragment that changed (a table body, a widget, a form step). Arm 8 behaves identically to Arm 7 for fragment boundaries. Fragment granularity is defined per archetype below.

## Archetype 1: multi-step form

A four-step checkout form: personal information, shipping address, payment, and review.

### Requirements

1. **Step navigation.** Forward and back buttons. The forward button is disabled until the current step's required fields are valid. The back button preserves entered data.
2. **Fields per step.**
   - Step 1 (personal): first name, last name, email, phone, account type (individual / business). All required.
   - Step 2 (shipping): street, city, state (dropdown, 50 US states), zip, country (dropdown, 10 countries). A checkbox "same as billing" that, when checked, copies values to a hidden billing group. All required.
   - Step 3 (payment): card number (16 digits), expiration (MM/YY), CVV (3 digits), cardholder name. All required.
   - Step 4 (review): read-only summary of all entered values. A "place order" button that logs the collected state to the console as JSON.
3. **Conditional fields.** When account type is "business," step 1 shows three additional fields: company name (required), tax ID (required), and purchase order number (optional).
4. **Validation.** Inline, on blur. Email must match a simple regex. Phone must be 10 digits. Zip must be 5 digits. Card number must pass Luhn check. Expiration must be in the future. Error messages appear below the field.
5. **Progress indicator.** A bar or stepper showing which step the user is on.

### State under management

Current step, all field values, all validation states, conditional field visibility, "same as billing" toggle.

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

A dashboard with a shared filter bar and three widgets that all respond to the same filters.

### Requirements

1. **Filter bar.** A date range picker (start and end date inputs), a category dropdown (one of 6 values, plus "all"), and an "apply" button. Filters are not applied until the button is clicked.
2. **Widget 1: summary cards.** Four cards showing: total revenue (sum), total orders (count), average order value (mean), and return rate (percentage). Computed from the filtered dataset.
3. **Widget 2: bar chart.** Revenue by category for the filtered date range. Rendered with a `<canvas>` element using Chart.js (the one permitted third-party library, version fixed across all arms). Hover shows a tooltip with the exact value.
4. **Widget 3: recent orders table.** The 10 most recent orders in the filtered set, showing order ID, date, customer name, amount, and status. Sorted by date descending. No pagination, no inline edit. Click a row to show a detail panel.
5. **Detail panel.** A side panel showing all fields of the clicked order. Closes with an X button or by clicking another row.
6. **Auto-refresh.** Every 60 seconds, re-read the data file and update all widgets. A "last updated" timestamp is visible.

### State under management

Filter values (pending and applied), computed aggregations, chart data, selected order, detail panel open/closed, refresh timer, last-updated timestamp.

## Archetype 4: large dataset browser

A scrollable list of records, designed to test state management under large payloads.

### Requirements

1. **Virtual scrolling.** Render only the rows visible in a 600px viewport, plus a 5-row overscan buffer above and below. Row height is fixed at 48px. All arms use the same virtual-scroll implementation (a shared utility, written once, imported by every arm) so the virtualization code is not a variable.
2. **Columns.** ID (integer), name (string), status (one of 5 values), created date (ISO date), value (float).
3. **Search.** A text input that filters by name, debounced at 300ms. The virtual list re-renders from the filtered set. A count below the input: "1,234 of 100,000 records."
4. **Detail panel.** Click a row to show all fields in a panel below the list. The selected row is highlighted.
5. **Multi-select.** Shift-click to select a range. Ctrl/Cmd-click to toggle individual rows. Selected count displayed: "42 selected."
6. **Batch status update.** A dropdown and "apply" button that sets all selected rows to a chosen status value. The dataset updates in place.

### State under management

Scroll position, visible window, search query, filtered set, selected row for detail, multi-select set, pending batch status value, the dataset itself (after updates).

## Archetype 5: editable grid

A spreadsheet-like grid of budget line items, designed to test the known scaling problem of editing cells in a large, non-virtualized table where changes propagate to dependent cells. This pattern is documented in practitioner benchmarks and in the design of every major grid library (AG Grid, Handsontable, react-datasheet-grid), all of which bypass React's rendering model to achieve acceptable performance.

### Requirements

1. **Grid layout.** A table of budget line items. No virtualization. All rows in the current payload are rendered in the DOM at once. This is the deliberate design choice: virtualization hides the rendering cost, and this archetype exists to measure it.
2. **Columns.** Category (string, one of 12 values), description (string), Q1 amount (float, editable), Q2 amount (float, editable), Q3 amount (float, editable), Q4 amount (float, editable), annual total (computed: Q1+Q2+Q3+Q4, read-only), variance from budget (computed: annual total minus a budget target from the data, read-only).
3. **Editable cells.** Click a Q1-Q4 cell to edit it in place. Tab moves to the next editable cell in the row, then to the first editable cell in the next row. Enter commits the edit. Escape cancels.
4. **Computed columns.** Annual total and variance update immediately when any quarterly amount changes. These are derived values, not stored state.
5. **Category subtotals.** A subtotal row appears after each category group, showing the sum of each quarterly column and the annual total for that category. Subtotals update when any cell in the category changes.
6. **Grand total row.** A final row shows the sum of all category subtotals. It updates when any cell in the grid changes.
7. **Conditional formatting.** Variance cells are green when positive, red when negative, and black when zero. Subtotal variance cells follow the same rule.
8. **Bulk fill.** Select a range of cells (click first, shift-click last in the same column). Enter a value in a popover input. All selected cells receive that value. Subtotals and grand total update.

### State under management

Every editable cell value, every computed cell value (annual totals, variances), every subtotal row (4 quarterly sums + annual + variance per category), the grand total row, the selected cell, the selected range for bulk fill, the pending bulk-fill value.

### Why this archetype stresses the code-style variable

A single cell edit touches one value, recomputes one annual total, one variance, one category subtotal row, and the grand total row. In conventional React, this cascades: the edited cell's state change propagates through context or props to every computed cell, every subtotal, and the grand total. Each of those is a component that re-renders. At 1,000 rows with no virtualization, a single keystroke touches roughly 2,000 components (1,000 data rows + 12 subtotal rows + 1 grand total, each with multiple cell components).

With flat functions and plain data, the server recalculates the affected subtotal and grand total as arithmetic on an array, renders the changed cells as HTML fragments, and returns them. The cost scales with the number of changed cells, not with the total number of cells in the grid.

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

## SSR fragment boundaries (arms 6-8)

Each archetype defines which HTML fragments the server renders on interaction. These boundaries are identical for all three SSR arms.

### Archetype 1 (form)

- **Initial load**: full page.
- **Step navigation**: the server renders the new step's form fields. The progress indicator is part of every step fragment.
- **Validation**: client-side, identical to CSR arms. Validation does not trigger a server request.

### Archetype 2 (table)

- **Initial load**: full page.
- **Sort, filter, paginate**: the server renders the `<tbody>` plus the pagination controls and selection count. One request per interaction.
- **Inline edit commit**: the server re-renders the affected `<tr>`.
- **Delete selected**: the server re-renders the `<tbody>`, pagination, and count.

### Archetype 3 (dashboard)

- **Initial load**: full page.
- **Apply filters**: the server renders all three widgets in a single response (three fragments, one request). Chart.js initialization runs client-side after the canvas element is swapped in.
- **Click table row (detail panel)**: the server renders the detail panel fragment.
- **Auto-refresh**: the client sends a request every 60 seconds; the server returns all three widgets.

### Archetype 4 (large dataset)

- **Initial load**: full page with the first viewport of rows.
- **Scroll**: the client requests the next batch of rows when the scroll position approaches the buffer boundary. The server renders a fragment of `<tr>` elements. Batch size equals the viewport plus overscan (same as the virtual-scroll window in the CSR arms).
- **Search**: the server filters, renders the first viewport of results, and returns the fragment plus a result count.
- **Click row (detail panel)**: the server renders the detail panel.
- **Batch status update**: the server applies the update, re-renders the affected rows, and returns them.

### Archetype 5 (editable grid)

- **Initial load**: full page with all rows rendered.
- **Cell edit commit**: the server re-renders the edited cell, its row's annual total and variance cells, the affected category subtotal row, and the grand total row. One request, one response containing all changed cells.
- **Bulk fill**: the server re-renders all filled cells, their annual totals and variances, every affected category subtotal row, and the grand total row. One request, one response.

## Arms summary

| Arm | Rendering | State layer | Server code style | Framework |
|---|---|---|---|---|
| 1. useState | CSR | React useState | n/a | React 18 |
| 2. Redux | CSR | Redux Toolkit | n/a | React 18 |
| 3. Zustand | CSR | Zustand | n/a | React 18 |
| 4. Signals | CSR | @preact/signals-react | n/a | React 18 |
| 5. stateless/domx | CSR | stateless + domx | n/a | React 18 |
| 6. htmx + genX + domx | SSR fragments | domx (DOM observation) + genX (declarative behavior) | Honest Code | htmx + genX + Express |
| 7. React SSR + hydration | SSR initial + CSR interactions | React useState | Honest Code | React 18 + Express |
| 8. React SSR + hydration (domain classes) | SSR initial + CSR interactions | React useState | Honest Code + domain classes | React 18 + Express |
| 9. React SSR + hydration (conventional) | SSR initial + CSR interactions | React useState | Conventional React | React 18 + Express |

All four SSR arms use React `renderToString` on the server, so React is the rendering engine across all nine arms. The experiment isolates two variables: where state lives (CSR vs SSR, Arms 1-5 vs 6-9) and how the server code is structured (Arms 7, 8, 9 form a three-point ablation from Honest Code through one conventional pattern to all five).

Arm 6 uses React only on the server. The client has no React runtime, no hydration, and no component tree. htmx handles requests and fragment swaps. genX handles client-side behavior declaratively through HTML attributes: smartx for form validation and conditional fields (Archetype 1), tablex for table sorting and selection (Archetypes 2 and 5), and fmtx for number and date formatting. domx observes DOM state for the cache-and-replay pattern. Client-side JS is htmx (~14KB) + genX (~1KB bootloader, modules loaded on demand) + domx (~2KB) + Chart.js (Archetype 3 only).

The form archetype (Archetype 1) is where genX produces the sharpest contrast. In Arms 1-5, every keystroke in a controlled input triggers a state update and a re-render of the form component. In Arm 6, the input is an HTML element. The user types, and the DOM value changes. genX's smartx validates on blur through an attribute (`fx-validate="email"`). Conditional fields appear through a binding attribute (`dx-bind="accountType:business"`). No JavaScript runs on keystroke. No component re-renders. The controlled-input problem does not exist because the input was never controlled.

Arm 7 uses React `renderToString` on the server for the initial page with Honest Code server components, then hydrates on the client. After hydration, interactions are client-side (identical to Arm 1).

Arm 8 is identical to Arm 7 except the server wraps raw JSON in domain model classes before rendering. This isolates the per-object overhead of class instantiation.

Arm 9 is identical to Arm 7 except the server components follow all five conventional React patterns (context providers, custom hooks, domain model classes, conditional branching, component hierarchies). The comparison across Arms 7, 8, and 9 identifies which patterns drive the performance gap.

## What this document does not specify

- The state management wiring inside each arm. That is the experimental variable.
- The CSS. A shared stylesheet is chosen before implementation and applied uniformly.
- The virtual-scroll utility. Written once, shared by all arms.
- The Chart.js configuration. Identical across arms for Archetype 3.
- The server rendering engine. Fixed as React `renderToString` across all SSR arms (specified in the SSR arms section above).
- Performance optimizations (memoization, batching, lazy loading). Each arm may apply optimizations idiomatic to its state library, within the tuning budget defined in the preregistration.
