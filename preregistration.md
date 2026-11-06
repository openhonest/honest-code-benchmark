# OSF preregistration: benchmarking alternatives to conventional web application design

Draft for submission to the OSF Registries. Adapt to the OSF Standard Pre-Data Collection Registration template before submitting.

## 1. Study information

### Title

Benchmarking alternatives to conventional web application design: DOM-as-state, functional server components, and server-rendered HTML in a controlled factorial experiment

### Authors

Adam Zachary Wasserman

### Description

The rendering-performance literature treats hydration cost as a property of the rendering mode (CSR vs SSR vs streaming). Every optimization strategy in that literature assumes a client-side component tree backed by a managed state layer, and argues about when to build the tree and how much to hydrate. 

The literature makes another assumption: that "SSR" means full-page server rendering or framework-level SSR (Next.js, Blazor), and "CSR" means a React or Angular SPA. The middle path — server renders, AJAX swaps the fragment, no client-side component tree, no managed state layer — is absent from the academic literature as a measured condition. No study compares the HTMX/hypermedia pattern against full CSR in a controlled design. The one documented case (Contexte, 2022) saw 50-60% TTI improvement moving from React to HTMX, but it was a migration case study, not a controlled experiment.

This study proposes that hydration and interaction costs are failure modes that can be removed by using the DOM as the sole client-side state layer, and that HTMX changes the latency cost model in ways that favor SSR over CSR. Finally, the study measures the impact of following Honest Code patterns in different SSR implementations, to disentangle the effects of that pattern from the effects of HTMX. 

We build the same five application archetypes, to a frozen task specification, using thirteen arms. Five are client-side rendered React 18 applications differing only in state management: useState (baseline), Redux Toolkit, Zustand, Preact Signals (via @preact/signals-react), and stateless/domx (DOM-as-state). Eight are server-rendered: a React SSR arm using stateless-domx hooks on the client (DOM as state post-hydration), a React SSR arm whose server components follow Honest Code principles, a React SSR arm that follows Honest Code except for domain model classes, a React SSR arm whose server components follow all five conventional React patterns, an htmx + EJS arm (Arm 10) where the server renders EJS templates and the client has no component tree or JavaScript framework, a FastAPI + Honest Code + htmx + domx + genX arm (Arm 11) where a Python server written to Honest Code principles renders Jinja2 templates and genX provides client-side formatting via declarative HTML attributes, a FastAPI + Honest Code + htmx arm (Arm 12) identical to Arm 11 on the server but without genX or domx on the client so the server pre-formats all values in Jinja2, and an htmx + EJS arm (Arm 13) whose Node server uses conventional class/object architecture with domain model classes and service layers. We measure bundle size, time to interactive, interaction to next paint, and memory across five payload sizes, two device classes, and five network latency profiles.

The design isolates four independent variables. The first is where state lives: CSR arms manage state in JavaScript, SSR arms move rendering to the server. The second is whether the client uses a component tree or AJAX fragment swaps: arms 1 through 9 use React, while arms 10 through 13 use htmx with no client-side framework. The third is how the server code is structured: Arm 7 uses Honest Code (pure function components, flat composition, plain data, config tables, I/O at the boundary). Arm 8 follows Honest Code except it wraps raw data in domain model classes. Arm 9 uses all five conventional patterns (context providers, custom hooks, domain classes, conditional branching, component hierarchies). Arm 13 uses conventional class/object patterns (domain model classes, service layers) on the Node htmx stack, providing a second data point for the code-style variable outside the React SSR ablation. The fourth is whether the client uses genX for declarative formatting: Arm 11 runs genX and domx on the client, while Arm 12 shares the same Python Honest Code server but pre-formats all values in Jinja2, isolating genX's client-side overhead.

The design also isolates measurements. The Server-Timing header reports four phases (load, map, render, serialize) so that server code-style comparisons use only the phases affected by code structure. Client-side INP captures the browser's rendering cost. Interaction-to-settled captures the full round trip for htmx arms, replacing INP as the primary comparison between CSR and server-rendered architectures. Bundle size is a single build-time measurement, independent of runtime metrics. This separation lets each hypothesis name one primary metric that answers its question without confounding server work with client work or network transit.

| Arm | Server | Client | What it tests | Key comparison |
|---|---|---|---|---|
| 1 | — | React CSR + useState | Baseline CSR | — |
| 2 | — | React CSR + Redux | Managed state (Redux) | vs 1, 5 (H1) |
| 3 | — | React CSR + Zustand | Managed state (Zustand) | vs 1, 5 (H1) |
| 4 | — | React CSR + Signals | Managed state (Signals) | vs 1, 5 (H1) |
| 5 | — | React CSR + stateless/domx | DOM as state (DATAOS) | vs 1-4 (H1, H2, H3) |
| 6 | Node, Honest Code, pages from SQLite | React SSR + stateless-domx | DATAOS + SSR + server paging | vs 7 (confounded with data access) |
| 7 | Node, Honest Code | React SSR + hydration | Honest Code server patterns | vs 8, 9 (ablation, H10) |
| 8 | Node, Honest Code + domain classes | React SSR + hydration | Domain class overhead | vs 7 (one pattern added) |
| 9 | Node, conventional (providers, hooks, classes, hierarchy) | React SSR + hydration | Full conventional React stack | vs 7 (all conventional patterns) |
| 10 | Node, EJS, minimal/functional | htmx, no framework | No client framework, minimal server | vs CSR (H6), vs 12 (runtime), vs 13 (code style) |
| 11 | Python, Honest Code, Jinja2 | htmx + genX + domx | Full Honest Code pipeline | vs 12 (genX overhead, H13) |
| 12 | Python, Honest Code, Jinja2 | htmx, no framework | Honest Code without genX | vs 10 (runtime, H12), vs 13 (cross-runtime code style, H14) |
| 13 | Node, EJS, conventional class/object | htmx, no framework | Conventional patterns in htmx | vs 10 (code-style overhead, H15), vs 12 (H14) |

Arms 7, 8, and 9 form a three-point ablation: they ship the same client bundle (verified by identical content hashes) and byte-identical server HTML, so any server response-time difference is caused by the server code patterns alone. The Arm 6 versus Arm 7 comparison measures the DATAOS client together with server-side data access; it does not isolate the DATAOS pattern alone (H1, using the CSR arms, does that).

The study author created and maintains the stateless, domx, and genX libraries, and wrote the Honest Code book whose principles govern the server-side code in Arms 6, 7, 11, and 12. The Honest Code principles are not novel individually: pure functions, flat composition, and plain data are established practices in functional programming. The book's contribution is collecting them into a named discipline and applying them to mainstream web development. This study measures whether that discipline produces a measurable performance difference on the server side, alongside the DATAOS state-layer question.

The five archetypes (multi-step form, data table, dashboard, large dataset browser, editable grid) are CRUD-oriented read-write interfaces. The results speak to the cost of the state layer on these interaction patterns. They do not generalize to applications dominated by cross-component coordination, optimistic updates with rollback, multi-user real-time consistency, or heavy derived state that is expensive to recompute from the DOM. Those patterns present different tradeoffs that this study does not measure.

Three of the four variables under study involve the author's own work (DATAOS, genX, Honest Code). This conflict of interest is the reason for preregistration, for the third-party implementation review, and for the tuning-budget protocol described below.

### Hypotheses

**H1 (primary).** The stateless/domx arm will have a lower median Interaction to Next Paint (INP) than each of the four managed-state arms, at every payload size. The difference will increase as payload size increases.

**H2.** The stateless/domx arm will have a lower median Time to Interactive (TTI) than each of the four managed-state arms, at every payload size.

**H3.** The stateless/domx arm will have a smaller total transferred bundle size (gzipped) than the Redux, Zustand, and Preact Signals arms at every payload size. (The useState arm has no added library, so this comparison is between stateless/domx and the three third-party libraries.)

**H4.** The performance gap between stateless/domx and the managed-state arms will be larger on the constrained device profile than on the desktop profile.

**H5 (exploratory, not confirmatory).** There exists a payload-size crossover point at which one or more managed-state arms outperform stateless/domx on INP. If this crossover exists, we will report the approximate size and the arm(s) involved.

**H6 (composition vs transit).** For interaction events (not initial load), the htmx+EJS arm's (Arm 10) median interaction-to-settled time will be lower than the median INP of all five CSR arms at 0ms, 20ms, and 50ms added RTT. Interaction-to-settled includes the full server round trip and DOM swap, so this comparison measures total user-visible latency for both architectures.

**H7 (crossover latency).** There exists a network latency at which the fastest CSR arm's median INP equals or beats the htmx+EJS arm's (Arm 10) median interaction-to-settled time. We will identify this crossover latency to the nearest 10ms by interpolating the measured curve.

**H8.** The htmx+EJS arm (Arm 10) will have the smallest client-side transferred bundle (gzipped) of all thirteen arms. Bundle size is a single measurement per arm per archetype; it does not vary by payload size or run.

**H9.** The React SSR + hydration arms (7, 8, and 9) will each have a lower median TTI than the React CSR + useState arm at all network latencies above 50ms RTT, because the server delivers renderable HTML before the client finishes parsing and executing the bundle. At 0ms and 20ms RTT, the advantage disappears or reverses because hydration cost dominates.

**H10 (server code style, ablation).** Server response time (Server-Timing `map` plus `render`) will differ among Arms 7, 8, and 9, with Arm 8 predicted above Arm 7 and Arm 9 predicted above Arm 8 at every payload size. Arm 8 (Honest Code + domain classes) will fall between Arms 7 and 9. If Arm 8 is closer to Arm 9 than to Arm 7, domain class instantiation is the primary driver. If Arm 8 is closer to Arm 7, the tree-depth patterns (providers, hooks, component hierarchy) are the primary driver. Arms 7, 8, and 9 ship the same client bundle, verified by identical content hashes, and their server HTML is byte-identical, verified per archetype and payload size by `apps/scripts/check-ssr-parity.mjs`, which also compares the bundle hashes. `apps/scripts/check-hydration.mjs` confirms that hydration logs no mismatch. Client-side metrics are therefore expected to be equivalent; we report them as a manipulation check and test equivalence with two one-sided tests (TOST) at a margin of ±10ms for INP and TTI.

**H11 (exploratory, not confirmatory).** The server response time gap between Arms 7 and 9 will increase as payload size increases. The three-point ablation (7, 8, 9) will show whether the scaling is driven by per-object cost (domain classes, which scale with row count) or by tree-depth cost (providers and hierarchy, which scale with component count).

**H12 (cross-runtime).** Arm 12 (FastAPI + Honest Code + htmx, Python, no genX) will have a server response time within 20% of Arm 10 (htmx + EJS, Node) at payload sizes up to 10,000 rows. At 50,000 and 100,000 rows, FastAPI's Python runtime may diverge from Node's V8 on template rendering throughput. Client-side interaction-to-settled time should not differ between Arms 10 and 12, because both deliver pre-formatted HTML fragments via htmx with no client-side JavaScript framework. This comparison isolates the language runtime and Honest Code server patterns from genX, because neither arm uses genX.

**H13 (genX client overhead).** Arm 11's genX formatting attributes (`fx-format="currency"`, `fx-format="date"`) will add measurable ScriptDuration compared to Arm 12's pre-formatted server output, but the difference will be less than 5ms per interaction at all payload sizes, because genX's bootloader scans only the swapped fragment, not the full DOM. Arms 11 and 12 share the same Python Honest Code server and Jinja2 templates; they differ only in whether the client runs genX and domx.

**H14 (cross-runtime code style).** Arm 12 (Python + Honest Code + htmx) will have a lower server response time than Arm 13 (Node + conventional class/object + htmx) at every payload size. This comparison crosses two variables: the language runtime (Python vs Node) and the code architecture (Honest Code vs conventional). The claim is a composite: the full Python + Honest Code stack is faster on the server than the conventional Node + class/object stack for the same task. Both arms use htmx on the client with no genX, so the comparison is isolated to server work.

**H15 (exploratory, not confirmatory).** Arm 13 (Node + htmx + EJS + conventional class/object) will have a higher server response time than Arm 10 (Node + htmx + EJS + minimal/functional) at every payload size, measuring the overhead of conventional class/object patterns within the same runtime and transport. Descriptive only.

## 2. Design plan

### Study type

Experiment. Controlled benchmark with factorial design.

### Factors

| Factor | Levels | Type |
|---|---|---|
| Arm | useState, Redux Toolkit, Zustand, Preact Signals, stateless/domx, React SSR+stateless-domx, React SSR+hydration (Honest Code), React SSR+hydration (domain classes), React SSR+hydration (conventional), htmx+EJS (minimal), FastAPI+Honest Code+htmx+domx+genX, FastAPI+Honest Code+htmx (no genX), htmx+EJS (conventional class/object) | Between-arm (13) |
| Archetype | Multi-step form, data table, dashboard, large dataset browser, editable grid | Between-archetype (5) |
| Payload size | 100, 1000, 10000, 50000, 100000 rows | Within-archetype (5) |
| Device class | Desktop (unthrottled), Mobile (4x CPU throttle via CDP `Emulation.setCPUThrottlingRate`) | Between-environment (2) |
| Network latency | 0ms, 20ms, 50ms, 100ms, 300ms added RTT | Between-environment (5) |

Total conditions: 13 × 5 × 5 × 2 × 5 = 3,250.

Network latency is simulated via Chrome DevTools Protocol network emulation. The five levels span localhost (0ms) through typical 3G (300ms). The three intermediate levels (20ms wired broadband, 50ms WiFi, 100ms 4G) give the interaction-time curve enough resolution to locate the crossover predicted by H7. Bandwidth is held constant at 10 Mbps at all five latency levels, including 0ms, so that latency, not throughput, is the variable under study.

### Blinding

Not applicable to data collection. The benchmark harness is fully automated; the experimenter does not make subjective judgments during data collection, and the analysis script runs on the collected CSV without manual intervention. Bias in the implementation phase is covered under **Experimenter bias** in section 6.

### Task specification

The frozen task specification is filed as a companion document (`task-specification.md`) and deposited alongside this preregistration. All thirteen arms build to that specification. No implementation may add features or optimizations beyond what the specification describes. For the SSR arms, the server must perform equivalent work to the CSR arms for each interaction: the same validation, the same derived-state updates (subtotals, grand totals, filter counts), and the same visual feedback. A faster INP in an SSR arm must reflect a faster execution path, not less work.

### Implementation time

Implementation and tuning time for each arm is recorded in a log committed to the replication package. Any arm whose time is an outlier (more than twice the median) is flagged in the paper.

Where an arm's state library maintains official example code for a pattern (e.g., Redux Toolkit's `createSlice` for form state), the implementation starts from that example. This reduces author bias by anchoring each arm to its maintainers' recommended patterns.

### Shared code

The following components are written once and used by all arms (unless otherwise noted):

- CSS stylesheet (shared visual appearance)
- Data generation script (seeded PRNG, seed: `6a1624e0-f793-442a-9f45-a3b80ba2419e`)
- Express.js server (SSR and htmx arms). The Express routes and data-loading logic are shared across the Node-based server-rendered arms. Arm 6 uses React `renderToString` with stateless-domx hooks (DOM as state) on the client and pages from SQLite; its comparison with Arm 7 includes data access (see the SQLite item below). Arms 7 and 8 use React `renderToString` with server components written to the Honest Code constraint; Arm 8 adds domain model classes. Arm 9 uses React `renderToString` with conventional React server components. Arm 10 uses EJS templates rendered by Express, with htmx on the client for interactions and no client-side JavaScript framework.
- FastAPI server (Arms 11 and 12). A standalone Python server serves all five archetypes for Arms 11 and 12. The server follows Honest Code principles: pure functions in `lib.py` (no I/O, no classes, typed dicts, dispatch tables), I/O at the boundary in `routes.py` (FastAPI handlers), Jinja2 templates with htmx attributes for interactions. Arm 11 adds genX attributes for client-side formatting and domx for DOM state observation. Arm 12 uses the same server code and templates but pre-formats all values in Jinja2, with no genX or domx on the client.
- Arm 13 (Node + htmx + EJS + conventional). A Node/Express server serves all five archetypes for Arm 13 using EJS templates and htmx, like Arm 10, but the server code uses conventional class/object architecture: domain model classes, service layers, and object instantiation per request. The same EJS templates and htmx interaction patterns as Arm 10, so the client is identical; only the server code structure differs.
- SQLite files built from the identical JSON files by one build script. The build manifest records source hashes, SQLite versions, and a canonical dump hash. Server-driven arms (6, 10, 11, 12, and 13) query a SQLite file per interaction and return one page of results. Client-side arms (1 through 5) and hydration arms (7, 8, and 9) receive the full dataset and filter, sort, and page in memory in the browser. The data-access strategy is part of the rendering-mode variable, not a separate factor, because production server-rendered applications page from a database. Comparisons H6 and H7, and the Arm 6 versus Arm 7 comparison, therefore measure rendering mode including data access. The `LIMIT`/`OFFSET` query returns rows in the shared sort order: lowercased ASCII, ties broken by ascending id, true before false for booleans, with filtering by case-insensitive substring match. H12 and H14 compare Node and Python on the same SQLite file and schema, so driver differences are part of the runtime comparison. Server-Timing reports the same phases in Node and Python (`load`, `map`, `render`, and `serialize`, omitting any phase an arm lacks) on full pages and htmx partials, so readers can separate query time from render time.

### Implementation order

Arms are implemented in randomized order per archetype. The randomization is generated before implementation begins and recorded in the replication package.

### Implementation freeze

All thirteen arms for all five archetypes are written to the frozen task specification, under the logged tuning budget, before any measured run begins. An independent programmer reviews the control-arm implementations (Arms 9 and 13) for specification fidelity before the freeze (see **Experimenter bias** in section 6). The complete source tree is deposited on Zenodo and assigned a DOI. No changes to application code are permitted after the deposit. Any bug fix discovered during data collection is logged as a preregistered deviation, and the fix, the reason, and the affected runs are reported in the paper.

The purpose of the implementation freeze is to close the window between registration and data collection in which the sole implementer could adjust implementations after seeing preliminary timings. Standard preregistration freezes the design and the analysis; this step also freezes the systems under test.

### Amendments before registration

Recorded Oct. 30, 2026, before any measured run.

1. **Data access.** Arms 6, 10, and 11 read one page per request from the SQLite files with `LIMIT`/`OFFSET`. Arms 1 through 5 and 7 through 9 receive the full dataset. The SQLite item under Shared code gives the reasoning and the affected comparisons. Arm 6 previously received the full dataset.
2. **Arm 6 comparison.** Because of item 1, Arm 6 versus Arm 7 no longer isolates the DATAOS pattern alone (Description, Shared code).
3. **Ablation arms.** Arms 7, 8, and 9 hydrate one shared client identical to Arm 1 after hydration. Arms 8 and 9 use conventional code and no Honest Code idioms beyond those the task specification assigns them.
4. **Interaction sequences.** The harness follows the selector contract in the task specification.
5. **Power.** The power statement under Justification is corrected from about 80% to about 40%. The run count stays at 30.
6. **Runtime.** Node.js 22 or later, declared in `engines`, with committed lockfiles; CI runs Node.js 22, set in `.nvmrc`; Python pinned with `.python-version` and `uv.lock`.

### Prior data collection (discarded)

An earlier version of this study (11 arms) collected data on Nov. 6, 2026, before this registration was submitted. That data has been discarded without inspection. The study author has not seen any results, summary statistics, or individual data points from that run. The redesign to 13 arms, the addition of third-party implementation review, and the decision to register before data collection made a fresh run necessary. The git history records the earlier design, the redesign, and the fact that no results were viewed between the two.

## 3. Sampling plan

### Sample size

30 runs per condition. 3,250 conditions × 30 runs = 97,500 total runs.

### Justification

30 runs per condition. Browser timing distributions are right-skewed and not normally distributed (Ollila et al. 2022 report the same), so we use nonparametric tests and do not compute required sample size from a power analysis that assumes normality. With 30 runs per group and Holm-Bonferroni correction across the largest family (100 tests for H1, so the strictest per-test alpha is 0.0005), a two-sided Mann-Whitney U test has about 40% power for a Cliff's delta of 0.45 (roughly Cohen's d of 0.85). Eighty percent power at that alpha would need about 55 to 60 runs per group. We keep 30 runs per condition to bound total run time, and we state the consequence: a nonsignificant result for an effect of this size in the H1 family is weak evidence of no effect, and we will report effect sizes with confidence intervals for every test regardless of significance. Smaller effects may not reach significance, but effects below our practical threshold (10ms or 10%) are not interpreted as meaningful regardless.

The run count is fixed at 30 per condition. We do not add runs based on observed variance, because doing so inflates the type I error rate.

### Data collection

Automated via Playwright. Before the measured runs for each condition, one warmup run follows the same steps and is discarded. The warmup eliminates cold-start outliers from JIT compilation, filesystem caching, and CDP session initialization. After the warmup, each measured run:

1. Opens a fresh browser context (no cache, no service workers).
2. Navigates to the application.
3. Waits for the load event.
4. Executes a scripted interaction sequence (defined per archetype, identical across arms).
5. Collects metrics via the Performance API and Chrome DevTools Protocol.
6. Closes the context.

Runs are sequential, not parallel, to avoid resource contention.

### Execution environment

All runs execute on a dedicated VPS (24 vCPU Intel Haswell, 92GB RAM, Debian 12, kernel 6.1.0-50-cloud-amd64, Chrome Headless Shell 156.0.8078.4, Node 22.23.4, Python 3.14.10) with no other user-facing workloads. The VPS has no CPU frequency scaling (virtual cores run at a fixed frequency set by the hypervisor). A dedicated server removes two confounds present on a developer workstation: background processes competing for CPU (mail, browser, OS indexing) and thermal throttling under sustained load. Both device profiles (desktop unthrottled and 4x CPU throttle) run on this same stable hardware. The "desktop" profile reflects the VPS at native speed; the "mobile" profile is simulated via Chrome DevTools Protocol CPU throttling. Network latency is simulated via CDP network emulation on all runs, including the 0ms baseline (which confirms the emulation layer itself adds negligible overhead).

### Interaction sequences

Each archetype has a scripted interaction sequence that exercises the state under management. The sequence is defined before any arm is implemented and is identical across arms.

- **Form**: fill all fields in steps 1-3, toggle business account type, navigate back and forward, submit on step 4.
- **Table**: sort by two columns, filter by a substring, paginate to page 3, inline-edit one cell, select 5 rows, delete selected.
- **Dashboard**: set a date range, a category, and a status; sort by amount twice; go to the next page; refresh, and check that the filters, sort, and page survive.
- **Large dataset**: go to the next page, search for a name, open the first result in the detail panel and close it, filter by a status, and sort by name.
- **Editable grid**: edit a Q1 cell in the first row (verify subtotal and totals row update), edit the Q2 cell in the same row, select 20 rows, bulk-fill their Q3 cells with one value (verify all 20 cells, their annual totals, affected subtotals, and the totals row update).

## 4. Variables

### Independent variables

- Arm (13 levels: 5 CSR, 8 SSR/server-rendered)
- Application archetype (5 levels)
- Payload size (5 levels)
- Device class (2 levels)
- Network latency (5 levels)

### Dependent variables (metrics)

| Metric | Source | Unit |
|---|---|---|
| Gzipped bundle size | Build output | Bytes |
| Parsed bundle size | Chrome DevTools Protocol | Bytes |
| Time to First Byte (TTFB) | Performance API (`responseStart - requestStart`) | ms |
| First Contentful Paint (FCP) | Performance API (`first-contentful-paint` entry) | ms |
| Largest Contentful Paint (LCP) | Performance API (`largest-contentful-paint` entry) | ms |
| Time to Interactive (TTI) | Long Task `PerformanceObserver`, 5-second quiet window after FCP | ms |
| Interaction to Next Paint (INP) | `PerformanceObserver` on `event` entries, 98th percentile | ms |
| Total Blocking Time (TBT) | Sum of (duration - 50ms) for Long Tasks between FCP and TTI | ms |
| JS heap used size | Chrome DevTools Protocol `Runtime.getHeapUsage` | Bytes |
| Cumulative Layout Shift (CLS) | `PerformanceObserver` on `layout-shift` entries, session-window algorithm | Score (unitless) |
| Server response time | `Server-Timing` header (`map` + `render` metrics) | ms |
| Interaction-to-settled | MutationObserver timestamp of last DOM mutation after interaction trigger | ms |
| Script duration | Chrome DevTools Protocol `Performance.getMetrics` (`ScriptDuration`) | Seconds |
| Layout duration | Chrome DevTools Protocol `Performance.getMetrics` (`LayoutDuration`) | Seconds |
| Style recalculation duration | Chrome DevTools Protocol `Performance.getMetrics` (`RecalcStyleDuration`) | Seconds |
| Task duration | Chrome DevTools Protocol `Performance.getMetrics` (`TaskDuration`) | Seconds |

Bundle sizes are measured once per arm per archetype (they do not vary by run). All other metrics are measured per run.

**TTFB note.** Chrome's network emulation via CDP applies latency before the Performance API's `requestStart` timestamp. As a result, TTFB (`responseStart - requestStart`) measures server processing time, not full round-trip time. Full network latency is captured by FCP. For the server code-style comparison (H10), the `Server-Timing` header reports four phases: `load` (data read), `map` (domain class construction), `render` (`renderToString` duration), and `serialize` (HTML shell assembly). The H10 outcome is `map` plus `render`, which isolates the code-style variable from data access and response serialization.

**TTI and TBT computation.** TTI and TBT are computed from Long Task observations rather than a Lighthouse audit, because Lighthouse controls its own navigation and conflicts with the harness's CDP network and CPU emulation. The computation follows the same algorithm Lighthouse uses internally: TTI is the end of the last Long Task before the first 5-second window with no Long Tasks after FCP. TBT is the sum of the blocking portion (duration minus 50ms) for each Long Task between FCP and TTI.

**Memory note.** The `performance.measureUserAgentSpecificMemory()` API is not available in Chrome's headless shell. We use the Chrome DevTools Protocol's `Runtime.getHeapUsage` instead, which reports a point-in-time snapshot of used and total heap. The snapshot is taken after the interaction sequence completes and before the browser context closes.

**CLS note.** Cumulative Layout Shift is computed from `layout-shift` PerformanceObserver entries using the session-window algorithm: shifts separated by less than 1 second, with a maximum window duration of 5 seconds, are grouped into sessions, and the largest session total is the CLS score. Shifts within 500ms of user input (where `hadRecentInput` is true) are excluded. CLS is the third Core Web Vital alongside LCP and INP. We expect near-zero values across all arms because the applications control their own CSS and data loading, but we measure it to confirm that the state architecture does not introduce layout instability.

**Browser duration breakdown note.** The Chrome DevTools Protocol `Performance.getMetrics` command returns cumulative durations (in seconds) for browser subsystems: `ScriptDuration` (JavaScript execution), `LayoutDuration` (DOM layout), `RecalcStyleDuration` (CSS style recalculation), and `TaskDuration` (all browser tasks). We enable the Performance domain with `timeDomain: 'timeTicks'` before navigation and read the cumulative values after the interaction sequence. These durations decompose where the browser spends its time during each run and identify whether performance differences between arms are driven by JavaScript execution, layout computation, or style recalculation.

**SSR data-shipping note.** Arms 7 through 9 inline the full dataset as `window.__SSR_DATA__` in the initial HTML response so the client can hydrate and handle subsequent interactions without re-fetching. Arm 6 inlines only the first page of rows from SQLite. At large payload sizes (50,000 and 100,000 rows), this adds tens of megabytes to the initial response. The htmx arms (10 through 13) send only the visible page of rows. This difference in data transfer is inherent to the two architectures and is not controlled for. Load metrics (TTI, FCP, LCP) at large payload sizes for the SSR+hydration arms will reflect this cost. The server code-style comparison (H10) uses server response time, which is unaffected by the data inline.

**INP note.** INP is reported as the 98th percentile of event-timing entries within a run. With approximately 10 scripted interactions per run, the 98th percentile is effectively the maximum. We report per-interaction latencies alongside the p98 value.

### Recorded but not analyzed

- Actual implementation time per arm (from the time log)
- Actual tuning time per arm
- Lines of state-management code per arm (counted by `cloc`, excluding shared code)
- Number of React re-renders during the interaction sequence (counted via React Profiler; CSR and React SSR arms only)
- HTML fragment size per interaction for SSR arms (bytes)
- Cumulative Layout Shift (CLS) per run (expected near-zero; confirms absence of layout instability, not a between-arm difference)

## 5. Analysis plan

### Smallest effect of practical interest

For timing metrics (INP, TTI, TTFB, server response time), the smallest effect we consider practically meaningful is 10ms or 10% of the baseline median, whichever is larger. For bundle size, the threshold is 5KB gzipped. Effects below these thresholds are reported but not interpreted as practically significant, regardless of statistical significance. With 30 runs per condition, even trivially small timing differences will reach significance, so practical significance governs interpretation.

### Primary metrics

Each confirmatory hypothesis names one primary metric. Secondary metrics are reported but do not decide the hypothesis.

| Hypothesis | Primary metric | Secondary metrics |
|---|---|---|
| H1 | INP (p98) | TTI, TBT |
| H2 | TTI | TBT |
| H3 | Gzipped bundle size | Parsed bundle size |
| H4 | INP (p98) | TTI |
| H6 | Interaction-to-settled (see below) | INP |
| H8 | Gzipped bundle size | n/a |
| H9 | TTI | FCP, LCP |
| H10 | Server response time (Server-Timing `map` + `render`) | Client-side INP and TTI (equivalence check) |
| H12 | Server response time | Interaction-to-settled |
| H14 | Server response time | Interaction-to-settled |

**Interaction-to-settled metric.** For H6 and H12, we add a metric that captures the full round trip for server-rendered arms: the time from user input to the moment the DOM reaches its final state after the htmx swap. We instrument this via a MutationObserver that marks the timestamp of the last mutation after each interaction trigger. This metric replaces INP as the primary comparison between CSR and server-rendered arms, because INP for an htmx request measures only the time to fire the async fetch, not the time to receive and swap the response.

### Error control

Each hypothesis defines one error-control family. The family includes every pairwise test that decides the hypothesis, across all cells (payload sizes, latencies, archetypes) where the hypothesis applies. We use the Holm-Bonferroni step-down procedure within each family, which is uniformly more powerful than Bonferroni.

### Confirmatory analyses (H1-H4, H6, H8-H10, H12, H14)

**H1-H4 (state layer comparison, CSR arms only).** We fit a quantile regression (median) on log-transformed INP with factors: arm (5 levels), payload size (5 levels), device class (2 levels), network latency (5 levels), archetype (5 levels), and a run-order covariate to absorb drift. Interaction terms arm × payload and arm × device are included. This single model answers H1 (arm main effect), H4 (arm × device interaction), and the H1 trend claim (arm × payload interaction).

For each payload size, pairwise Mann-Whitney U tests compare stateless/domx against each managed-state arm on the primary metric. The error-control family for H1 is all 4 comparisons × 5 payload sizes × 5 archetypes = 100 tests. Holm-Bonferroni correction across the family. Effect size: Cliff's delta with 95% confidence interval computed by the normal approximation to the Mann-Whitney statistic.

H1 is supported if stateless/domx has a significantly lower median INP than each managed-state arm at every payload size, with Cliff's delta exceeding the practical threshold. H1 is disconfirmed if any managed-state arm equals or beats stateless/domx at any payload size.

**H4 (device interaction).** The arm × device interaction term in the quantile regression is tested at alpha = 0.05. If significant, we report the ratio of Cliff's delta on mobile to Cliff's delta on desktop for each comparison. H4 is supported if the ratio exceeds 1.0 for all four comparisons.

**H6 (composition vs transit).** At each of the three specified latencies (0ms, 20ms, 50ms), Mann-Whitney U tests compare Arm 10's interaction-to-settled time against each CSR arm's INP. The family is 5 comparisons × 3 latencies = 15 tests; Holm-Bonferroni correction. H6 is supported if Arm 10 is faster at all three latencies. H6 is disconfirmed if any CSR arm equals or beats Arm 10 at any of the three latencies.

**H8 (bundle size).** Descriptive. Bundle size is a single measurement per arm per archetype. Report the gzipped and parsed transfer size for each arm. No statistical test.

**H9 (SSR initial load advantage).** At each latency, Mann-Whitney U on TTI comparing each React SSR + hydration arm (7, 8, 9) against React CSR + useState. The family is 3 comparisons × 5 latencies = 15 tests; Holm-Bonferroni correction. H9 predicts that all three SSR arms have lower TTI at latencies above 50ms and higher TTI at 0ms and 20ms. H9 is disconfirmed if the direction at 100ms or 300ms favors CSR, or if the reversal at 0ms does not appear.

**H10 (server code style, ablation).** At each payload size, Kruskal-Wallis on server response time (`map` + `render` from `Server-Timing`) across Arms 7, 8, and 9. If significant, pairwise Mann-Whitney U for the three pairs. The family is 3 pairs × 5 payload sizes = 15 tests; Holm-Bonferroni correction. For the client-side equivalence claim, we use two one-sided tests (TOST) on INP and TTI with an equivalence bound of 10ms. The equivalence family is 3 pairs × 5 payload sizes × 2 metrics = 30 TOST procedures; Holm-Bonferroni correction. The equivalence claim is supported by identical client bundle hashes and byte-identical server HTML across the three arms. Cliff's delta with 95% CI for all comparisons.

H10 is disconfirmed if Arms 7, 8, and 9 do not differ significantly on server response time at any payload size, or if they differ on client-side INP or TTI beyond the equivalence bound. We report which arm Arm 8 is closer to (7 or 9) as the ablation finding; if all three are within the equivalence bound on server time, we report that the ablation detected no difference.

**H12 (cross-runtime).** At each payload size, Mann-Whitney U on server response time comparing Arm 12 against Arm 10. The "within 20%" prediction is tested by TOST with an equivalence bound of 20% of Arm 10's median at each payload size. The family is 5 payload sizes; Holm-Bonferroni correction. For client-side interaction-to-settled, TOST with a 10ms equivalence bound. Cliff's delta with 95% CI.

**H14 (cross-runtime code style).** At each payload size, Mann-Whitney U on server response time comparing Arm 12 against Arm 13. The family is 5 payload sizes; Holm-Bonferroni correction. H14 is supported if Arm 12 has a significantly lower server response time than Arm 13 at every payload size, with Cliff's delta exceeding the practical threshold. H14 is disconfirmed if Arm 13 equals or beats Arm 12 at any payload size. Because this comparison crosses two variables (runtime and code architecture), we also report Arm 10 versus Arm 13 (code style within Node) and Arm 10 versus Arm 12 (runtime within minimal/functional code) to decompose the composite effect. Cliff's delta with 95% CI for all comparisons.

### Exploratory analyses (H5, H7, H11, H13, H15)

**H5 (payload crossover).** Plot each metric against payload size, one curve per arm. Visually inspect for crossover. If curves cross, report the approximate payload size and the arms involved. Descriptive only.

**H7 (latency crossover).** Plot interaction-to-settled time against network latency for Arm 10 and the fastest CSR arm at each latency level. Fit a linear interpolation to each curve and report the latency at which they intersect. If they do not intersect within the measured range (0-300ms), report that the crossover, if it exists, is above 300ms RTT. Descriptive only.

**H11 (code-style scaling).** Plot server response time against payload size, one curve each for Arms 7, 8, and 9. Visually inspect whether the gap grows with payload size and whether Arm 8 tracks Arm 7 or Arm 9. Descriptive only.

**H13 (genX client overhead).** At each payload size, Mann-Whitney U on ScriptDuration per interaction comparing Arm 11 against Arm 12. Arm 11 runs genX formatting on each htmx swap; Arm 12 delivers pre-formatted HTML from the same Python Honest Code server. The family is 5 payload sizes; Holm-Bonferroni correction. Report whether the difference exceeds 5ms and whether it scales with payload size. Cliff's delta with 95% CI.

**H15 (conventional overhead in Node htmx).** Plot server response time against payload size for Arms 10 and 13. Both use Node + htmx + EJS; Arm 13 adds conventional class/object patterns. Report the difference and whether it scales with payload size. Descriptive only.

### Robustness checks

- Trim the top and bottom 5% of runs per condition and re-run the confirmatory analysis on the trimmed data.
- Report results for both the full and trimmed datasets. If they disagree, report both and discuss.
- Include the run-order covariate in all models to check for drift. If drift is significant, report the model with and without it.

### What we will report regardless of outcome

- All 97,500 data points, deposited as CSV in the replication package.
- Median and IQR for every metric, condition, and arm.
- The tuning-time log.
- Any arm that exceeded its tuning budget.
- The implementation-order randomization.
- The analysis script, deposited before data collection begins.

## 6. Threats to validity

**Internal validity.** All thirteen arms run on one machine, sharing CPU and memory. A background process competing for resources during a run would affect the measurement. We mitigate this by running on a dedicated VPS with no other workload, discarding one warmup run per condition, randomizing run order with a seeded PRNG, and including run order as a covariate. CDP CPU throttling for the mobile profile throttles only the renderer process; OS-level scheduling is not controlled.

**Construct validity.** INP, TTI, and TBT are proxies for perceived responsiveness, not direct measures of user experience. The five archetypes are representative of common web applications but do not cover every UI pattern. The scripted interactions exercise the specified task but not exploratory user behavior.

**External validity.** All measurements come from a single Chrome version on a single OS and hardware configuration. Results may not generalize to other browsers, operating systems, or hardware. The synthetic data is realistic but not production data. The network emulation is simulated, not a real network path.

**Experimenter bias.** The study author implemented all thirteen arms, wrote the harness, and maintains three of the libraries under study (stateless, domx, and genX), so bias in the implementation phase is possible. The instruments for managing it are this preregistration and its hypotheses, the frozen task specification, the automated correctness checks, the tuning budget, the use of library-maintained reference patterns, the conventional-React control arm (Arm 9), the conventional-htmx control arm (Arm 13), the domain-class ablation arm (Arm 8), the implementation freeze with a pre-collection Zenodo deposit, an independent programmer's review of all implementations for specification fidelity before the freeze, and the commitment to deposit all raw data.

## 7. Replication package

Two Zenodo deposits, each assigned its own DOI:

**Pre-collection deposit** (before any measured run):

- This preregistration document
- The frozen task specification
- Source code for all thirteen arms of all five archetypes
- The independent reviewer's report on specification fidelity
- The data generation script and all generated JSON files
- The Playwright benchmark harness
- The tuning-time log
- The implementation-order randomization

**Post-collection deposit** (before the paper is submitted):

- The analysis script (R or Python)
- Raw data (CSV, all 97,500 runs)
- Any preregistered deviations logged during data collection
- A link to the pre-collection deposit DOI

## 8. Conflict of interest statement

The study author created and maintains the stateless, domx, and genX libraries, has a commercial interest in the DATAOS architecture through the multicardz product, and is the author of the Honest Code book whose principles govern the server-side code in Arms 6, 7, 11, and 12. DATAOS, genX, and Honest Code are all under study, so the conflict applies to three of the four independent variables. The instruments for managing it are listed under **Experimenter bias** in section 6.

## Sources

- Clapton, J., Bastos, H., Batisteli, J. P. O., Seufitelli, D. B., and Tavares, C. (2025). Client-Side vs Server-Side Rendering: Impacts on Performance and User Experience in Web Applications. SBQS 2025, 165-172.
- Ollila, R., Makitalo, N., and Mikkonen, T. (2022). Modern Web Frameworks: A Comparison of Rendering Performance. Journal of Web Engineering 21(3), 789-814.
- Vepsalainen, J., Hellas, A., and Vuorimaa, P. (2024). Overview of Web Application Performance Optimization Techniques. arXiv:2412.07892.
- Vepsalainen, J., Hellas, A., and Vuorimaa, P. (2023). The State of Disappearing Frameworks in 2023. WEBIST 2023, 232-241.
- Chen, K. (2025). Improving Front-end Performance through Modular Rendering and Adaptive Hydration in React Applications. arXiv:2504.03884.
