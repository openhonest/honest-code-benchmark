# OSF preregistration: hydration cost as a function of client-side state

Draft for submission to the OSF Registries. Adapt to the OSF Standard Pre-Data Collection Registration template before submitting.

## 1. Study information

### Title

Hydration cost as a function of client-side state layer: a controlled benchmark of DOM-as-state versus managed state in React applications

### Authors

Adam Zachary Wasserman

### Description

The rendering-performance literature treats hydration cost as a property of the rendering mode (CSR vs SSR vs streaming). Every optimization strategy in that literature assumes a client-side component tree backed by a managed state layer, and argues about when to build the tree and how much to hydrate. This study asks a different question: what happens to hydration and interaction cost when the client-side state layer is removed entirely and the DOM serves as the single source of truth?

We build the same five application archetypes, to a frozen task specification, using eleven arms. Five are client-side rendered React 18 applications differing only in state management: useState (baseline), Redux Toolkit, Zustand, Preact Signals (via @preact/signals-react), and stateless/domx (DOM-as-state). Six are server-rendered: a React SSR arm using stateless-domx hooks on the client (DOM as state post-hydration), a React SSR arm whose server components follow Honest Code principles, a React SSR arm that follows Honest Code except for domain model classes, a React SSR arm whose server components follow all five conventional React patterns, an htmx + EJS arm where the server renders EJS templates and the client has no component tree or JavaScript framework, and a FastAPI + Honest Code + htmx + domx + genX arm (Arm 11) where a Python server written to Honest Code principles renders Jinja2 templates, htmx handles interactions, and genX provides client-side formatting via declarative HTML attributes. We measure bundle size, time to interactive, interaction to next paint, and memory across five payload sizes, two device classes, and five network latency profiles.

The design isolates two independent variables. The first is where state lives: CSR arms manage state in JavaScript, SSR arms move rendering to the server. The second is how the server code is structured: Arm 7 uses Honest Code (pure function components, flat composition, plain data, config tables, I/O at the boundary). Arm 8 follows Honest Code except it wraps raw data in domain model classes. Arm 9 uses all five conventional patterns (context providers, custom hooks, domain classes, conditional branching, component hierarchies). Arm 6 uses React SSR with stateless-domx hooks on the client, isolating the DATAOS pattern as the single variable against Arm 9. Arm 10 uses htmx + EJS with no client-side framework at all, testing what happens when the client does no rendering. Arm 11 uses FastAPI (Python) with Honest Code principles on the server, htmx for interactions, and genX + domx for client-side formatting and DOM state, testing the full Honest Code pipeline across a different language runtime. Arms 7, 8, and 9 form a three-point ablation that identifies which patterns drive any performance gap.

The study author created and maintains the stateless and domx libraries, and wrote the Honest Code book whose principles govern the server-side code in Arms 6 and 7. The Honest Code principles are not novel individually: pure functions, flat composition, and plain data are established practices in functional programming. The book's contribution is collecting them into a named discipline and applying them to mainstream web development, where they remain the minority pattern. This study measures whether that discipline produces a measurable performance difference on the server side, alongside the DATAOS state-layer question.

The five archetypes (multi-step form, data table, dashboard, large dataset browser, editable grid) are CRUD-oriented read-write interfaces. The results speak to the cost of the state layer on these interaction patterns. They do not generalize to applications dominated by cross-component coordination, optimistic updates with rollback, multi-user real-time consistency, or heavy derived state that is expensive to recompute from the DOM. Those patterns present different tradeoffs that this study does not measure.

Both variables under study are the author's own work. This conflict of interest is the reason for preregistration and for the tuning-budget protocol described below.

### Hypotheses

**H1 (primary).** The stateless/domx arm will have a lower median Interaction to Next Paint (INP) than each of the four managed-state arms, at every payload size. The difference will increase as payload size increases.

**H2.** The stateless/domx arm will have a lower median Time to Interactive (TTI) than each of the four managed-state arms, at every payload size.

**H3.** The stateless/domx arm will have a smaller total transferred bundle size (gzipped) than the Redux, Zustand, and Preact Signals arms at every payload size. (The useState arm has no added library, so this comparison is between stateless/domx and the three third-party libraries.)

**H4.** The performance gap between stateless/domx and the managed-state arms will be larger on the constrained device profile than on the desktop profile.

**H5 (exploratory, not confirmatory).** There exists a payload-size crossover point at which one or more managed-state arms outperform stateless/domx on INP. If this crossover exists, we will report the approximate size and the arm(s) involved.

**H6 (composition vs transit).** For interaction events (not initial load), the htmx+EJS arm's (Arm 10) median INP will be lower than the median INP of all five CSR arms at 0ms, 20ms, and 50ms added RTT. This tests the claim that server HTML rendering plus network transit plus browser swap is faster than client-side component composition, at broadband and WiFi latencies.

**H7 (crossover latency).** There exists a network latency at which the fastest CSR arm's median INP equals or beats the htmx+EJS arm's (Arm 10) median INP. We will identify this crossover latency to the nearest 10ms by interpolating the measured curve.

**H8.** The htmx+EJS arm (Arm 10) will have the smallest client-side transferred bundle (gzipped) of all eleven arms, at every payload size.

**H9.** The React SSR + hydration arms (7, 8, and 9) will each have a lower median TTI than the React CSR + useState arm at all network latencies above 50ms RTT, because the server delivers renderable HTML before the client finishes parsing and executing the bundle. At 0ms and 20ms RTT, the advantage disappears or reverses because hydration cost dominates.

**H10 (server code style, ablation).** Arm 7 (Honest Code) will have a lower median server response time than Arm 9 (full conventional) at every payload size. Arm 8 (Honest Code + domain classes) will fall between Arms 7 and 9. If Arm 8 is closer to Arm 9 than to Arm 7, domain class instantiation is the primary driver. If Arm 8 is closer to Arm 7, the tree-depth patterns (providers, hooks, component hierarchy) are the primary driver. Client-side metrics (INP, TTI after hydration) will not differ among Arms 7, 8, and 9, because all three hydrate to identical client-side code.

**H11 (exploratory, not confirmatory).** The server response time gap between Arms 7 and 9 will increase as payload size increases. The three-point ablation (7, 8, 9) will show whether the scaling is driven by per-object cost (domain classes, which scale with row count) or by tree-depth cost (providers and hierarchy, which scale with component count).

**H12 (full pipeline cross-runtime).** Arm 11 (FastAPI + Honest Code + htmx + domx + genX) will have a server response time within 20% of Arm 10 (htmx + EJS) at payload sizes up to 10,000 rows. At 50,000 and 100,000 rows, FastAPI's Python runtime may diverge from Node's V8 on template rendering throughput. Client-side metrics (INP after the initial load) will not differ between Arms 10 and 11, because both deliver the same HTML fragments and the client-side work (htmx swap plus genX formatting) is identical.

**H13 (exploratory, not confirmatory).** Arm 11's genX formatting attributes (`fx-format="currency"`, `fx-format="date"`) will add measurable ScriptDuration compared to Arm 10's pre-formatted server output, but the difference will be less than 5ms per interaction at all payload sizes, because genX's bootloader scans only the swapped fragment, not the full DOM.

## 2. Design plan

### Study type

Experiment. Controlled benchmark with factorial design.

### Factors

| Factor | Levels | Type |
|---|---|---|
| Arm | useState, Redux Toolkit, Zustand, Preact Signals, stateless/domx, React SSR+stateless-domx, React SSR+hydration (Honest Code), React SSR+hydration (domain classes), React SSR+hydration (conventional), htmx+EJS, FastAPI+Honest Code+htmx+domx+genX | Between-arm (11) |
| Archetype | Multi-step form, data table, dashboard, large dataset browser, editable grid | Between-archetype (5) |
| Payload size | 100, 1000, 10000, 50000, 100000 rows | Within-archetype (5) |
| Device class | Desktop (unthrottled), Mobile (4x CPU throttle via CDP `Emulation.setCPUThrottlingRate`) | Between-environment (2) |
| Network latency | 0ms, 20ms, 50ms, 100ms, 300ms added RTT | Between-environment (5) |

Total conditions: 11 × 5 × 5 × 2 × 5 = 2,750.

Network latency is simulated via Chrome DevTools Protocol network emulation. The five levels span localhost (0ms) through typical 3G (300ms). The three intermediate levels (20ms wired broadband, 50ms WiFi, 100ms 4G) give the interaction-time curve enough resolution to locate the crossover predicted by H7. Bandwidth is held constant at 10 Mbps for all non-zero latency levels so that latency, not throughput, is the variable under study.

### Blinding

Not applicable. The benchmark harness is automated and the experimenter does not make subjective judgments during data collection. The analysis script runs on the collected data without manual intervention.

### Task specification

The frozen task specification is filed as a companion document (`task-specification.md`) and deposited alongside this preregistration. All eleven arms build to that specification. No implementation may add features or optimizations beyond what the specification describes. For the SSR arms, the server must perform equivalent work to the CSR arms for each interaction: the same validation, the same derived-state updates (subtotals, grand totals, filter counts), and the same visual feedback. A faster INP in an SSR arm must reflect a faster execution path, not less work.

### Tuning budget

Each arm receives 8 hours of implementation time and 4 hours of tuning time. Tuning includes memoization, batching, lazy evaluation, or any optimization idiomatic to the state library. Time is tracked in a log committed to the replication package. Any arm that exceeds the budget is flagged in the paper and its excess time is reported.

Where an arm's state library maintains official example code for a pattern (e.g., Redux Toolkit's `createSlice` for form state), the implementation starts from that example. This reduces author bias by anchoring each arm to its maintainers' recommended patterns.

### Shared code

The following components are written once and used by all arms:

- CSS stylesheet (shared visual appearance)
- Data generation script (seeded PRNG, seed: `6a1624e0-f793-442a-9f45-a3b80ba2419e`)
- Virtual-scroll utility (Archetype 4, CSR arms only)
- Chart.js configuration (Archetype 3, Chart.js version fixed at 4.4.x)
- Express.js server (SSR and htmx arms). The Express routes and data-loading logic are shared across the Node-based server-rendered arms. Arm 6 uses React `renderToString` with stateless-domx hooks (DOM as state) on the client, isolating the DATAOS pattern as the single variable against Arm 9. Arms 7 and 8 use React `renderToString` with server components written to the Honest Code constraint; Arm 8 adds domain model classes. Arm 9 uses React `renderToString` with conventional React server components. Arm 10 uses EJS templates rendered by Express, with htmx on the client for interactions and no client-side JavaScript framework.
- FastAPI server (Arm 11). A standalone Python server serves all five archetypes for Arm 11. The server follows Honest Code principles: pure functions in `lib.py` (no I/O, no classes, typed dicts, dispatch tables), I/O at the boundary in `routes.py` (FastAPI handlers), Jinja2 templates with htmx attributes for interactions, genX attributes for client-side formatting, and domx for DOM state observation.
- Static JSON data files (identical across all arms)

### Implementation order

Arms are implemented in randomized order per archetype. The randomization is generated before implementation begins and recorded in the replication package.

### Implementation freeze

All eleven arms for all five archetypes are written to the frozen task specification, under the logged tuning budget, before any measured run begins. The complete source tree is then deposited on Zenodo and assigned a DOI. This preregistration is updated with that DOI before data collection starts. No changes to application code are permitted after the deposit. Any bug fix discovered during data collection is logged as a preregistered deviation, and the fix, the reason, and the affected runs are reported in the paper.

The purpose of the implementation freeze is to close the window between registration and data collection in which the sole implementer could adjust implementations after seeing preliminary timings. Standard preregistration freezes the design and the analysis; this step also freezes the systems under test.

## 3. Sampling plan

### Sample size

30 runs per condition. 2,750 conditions × 30 runs = 82,500 total runs.

### Justification

30 runs gives sufficient power for nonparametric tests (Mann-Whitney U, Kruskal-Wallis) at the conventional alpha = 0.05 level, and produces a reliable estimate of the median and interquartile range. Browser timing distributions are right-skewed and not normally distributed (Ollila et al. 2022 report the same), so we do not assume normality and do not compute required sample size from a power analysis that assumes it.

If the coefficient of variation for any metric in any condition exceeds 0.30 after 30 runs, we collect 30 additional runs for that condition and report both batches.

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

All runs execute on a dedicated VPS (8 vCPU Intel Haswell, 22GB RAM, Debian 13) with no other user-facing workloads. A dedicated server removes two confounds present on a developer workstation: background processes competing for CPU (mail, browser, OS indexing) and thermal throttling under sustained load. Both device profiles (desktop unthrottled and 4x CPU throttle) run on this same stable hardware. The "desktop" profile reflects the VPS at native speed; the "mobile" profile is simulated via Chrome DevTools Protocol CPU throttling. Network latency is simulated via CDP network emulation on all runs, including the 0ms baseline (which confirms the emulation layer itself adds negligible overhead).

### Interaction sequences

Each archetype has a scripted interaction sequence that exercises the state under management. The sequence is defined before any arm is implemented and is identical across arms.

- **Form**: fill all fields in steps 1-3, toggle business account type, navigate back and forward, submit on step 4.
- **Table**: sort by two columns, filter by a substring, paginate to page 3, inline-edit one cell, select 5 rows, delete selected.
- **Dashboard**: set a date range and category, click apply, hover over a chart bar, click a table row to open the detail panel, close it.
- **Large dataset**: scroll to row ~500, search for a name, click a result, shift-click to select a range, apply a batch status update.
- **Editable grid**: edit a Q1 cell in the first row (verify subtotal and grand total update), tab to Q2 and edit it, select a range of 20 cells in the Q3 column via click then shift-click, bulk-fill a value (verify all 20 cells, their annual totals, affected subtotals, and the grand total update).

## 4. Variables

### Independent variables

- Arm (11 levels: 5 CSR, 6 SSR/server-rendered)
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
| Script duration | Chrome DevTools Protocol `Performance.getMetrics` (`ScriptDuration`) | Seconds |
| Layout duration | Chrome DevTools Protocol `Performance.getMetrics` (`LayoutDuration`) | Seconds |
| Style recalculation duration | Chrome DevTools Protocol `Performance.getMetrics` (`RecalcStyleDuration`) | Seconds |
| Task duration | Chrome DevTools Protocol `Performance.getMetrics` (`TaskDuration`) | Seconds |

Bundle sizes are measured once per arm per archetype (they do not vary by run). All other metrics are measured per run.

**TTFB note.** Chrome's network emulation via CDP applies latency before the Performance API's `requestStart` timestamp. As a result, TTFB (`responseStart - requestStart`) measures server processing time, not full round-trip time. Full network latency is captured by FCP. For the server code-style comparison (H10), the `Server-Timing: render` header reports the `renderToString` duration directly, independent of network emulation.

**TTI and TBT computation.** TTI and TBT are computed from Long Task observations rather than a Lighthouse audit, because Lighthouse controls its own navigation and conflicts with the harness's CDP network and CPU emulation. The computation follows the same algorithm Lighthouse uses internally: TTI is the end of the last Long Task before the first 5-second window with no Long Tasks after FCP. TBT is the sum of the blocking portion (duration minus 50ms) for each Long Task between FCP and TTI.

**Memory note.** The `performance.measureUserAgentSpecificMemory()` API is not available in Chrome's headless shell. We use the Chrome DevTools Protocol's `Runtime.getHeapUsage` instead, which reports a point-in-time snapshot of used and total heap. The snapshot is taken after the interaction sequence completes and before the browser context closes.

**CLS note.** Cumulative Layout Shift is computed from `layout-shift` PerformanceObserver entries using the session-window algorithm: shifts separated by less than 1 second, with a maximum window duration of 5 seconds, are grouped into sessions, and the largest session total is the CLS score. Shifts within 500ms of user input (where `hadRecentInput` is true) are excluded. CLS is the third Core Web Vital alongside LCP and INP. We expect near-zero values across all arms because the applications control their own CSS and data loading, but we measure it to confirm that the state architecture does not introduce layout instability.

**Browser duration breakdown note.** The Chrome DevTools Protocol `Performance.getMetrics` command returns cumulative durations (in seconds) for browser subsystems: `ScriptDuration` (JavaScript execution), `LayoutDuration` (DOM layout), `RecalcStyleDuration` (CSS style recalculation), and `TaskDuration` (all browser tasks). We enable the Performance domain with `timeDomain: 'timeTicks'` before navigation and read the cumulative values after the interaction sequence. These durations decompose where the browser spends its time during each run and identify whether performance differences between arms are driven by JavaScript execution, layout computation, or style recalculation.

### Recorded but not analyzed

- Actual implementation time per arm (from the time log)
- Actual tuning time per arm
- Lines of state-management code per arm (counted by `cloc`, excluding shared code)
- Number of React re-renders during the interaction sequence (counted via React Profiler; CSR and React SSR arms only)
- Server response time for SSR arms (measured via `Server-Timing` header, excluding simulated network latency)
- HTML fragment size per interaction for SSR arms (bytes)
- Cumulative Layout Shift (CLS) per run (expected near-zero; confirms absence of layout instability, not a between-arm difference)
- Browser duration breakdown per run: ScriptDuration, LayoutDuration, RecalcStyleDuration, TaskDuration (diagnostic; decomposes where the browser spends time but is not the subject of a hypothesis)

## 5. Analysis plan

### Confirmatory analyses (H1-H4, H6, H8-H10, H12)

**H1-H4 (state layer comparison, CSR arms only).** For each metric, at each payload size:

1. **Kruskal-Wallis test** across all five CSR arms. If significant (alpha = 0.05), proceed to pairwise comparisons.
2. **Mann-Whitney U tests** comparing stateless/domx against each of the four managed-state arms. Bonferroni correction for 4 comparisons (adjusted alpha = 0.0125).
3. **Effect size**: Cliff's delta for each pairwise comparison. We report the point estimate and 95% confidence interval.
4. **H4 (device interaction)**: For each metric, compare the stateless-vs-managed-state difference on desktop against the same difference on mobile. A larger Cliff's delta on mobile supports H4.

**H6 (composition vs transit).** At each of the three specified latencies (0ms, 20ms, 50ms), Mann-Whitney U tests comparing the htmx+genX+domx arm's INP against each CSR arm's INP. Bonferroni correction for 5 comparisons × 3 latencies = 15 tests (adjusted alpha = 0.0033). Cliff's delta for effect size.

**H8 (bundle size).** Descriptive. Bundle size is a single measurement per arm per archetype, not a distribution. Report the gzipped transfer size for each arm and archetype.

**H9 (SSR initial load advantage).** At each latency, Mann-Whitney U on TTI comparing each React SSR + hydration arm (7, 8, and 9) against React CSR + useState. Bonferroni correction for 3 arms x 5 latency levels = 15 tests (adjusted alpha = 0.0033). We predict all three SSR arms win at 50ms+ and lose at 0-20ms; we report whichever direction the data shows.

**H10 (server code style, ablation).** At each payload size, Kruskal-Wallis on server response time across Arms 7, 8, and 9. If significant, pairwise Mann-Whitney U for the three pairs (7 vs 8, 7 vs 9, 8 vs 9). Bonferroni correction for 3 pairs x 5 payload sizes = 15 tests (adjusted alpha = 0.0033). For client-side metrics (INP, TTI after hydration), Kruskal-Wallis across Arms 7, 8, and 9 at each payload size; we predict no significant difference. Cliff's delta for effect size on all pairwise comparisons. We report which arm Arm 8 is closer to (7 or 9) as the ablation finding.

**H12 (full pipeline cross-runtime).** At each payload size, Mann-Whitney U on server response time comparing Arm 11 (FastAPI) against Arm 10 (Express + EJS). For client-side INP, Mann-Whitney U comparing Arms 10 and 11 at each payload size and latency level. Bonferroni correction for 5 payload sizes × 5 latency levels = 25 tests for INP (adjusted alpha = 0.002). We predict no significant difference on INP. Cliff's delta for effect size.

### Exploratory analyses (H5, H7, H11, H13)

**H5 (payload crossover).** Plot each metric against payload size, one curve per arm. Visually inspect for crossover. If curves cross, report the approximate payload size and the arms involved. Descriptive only.

**H7 (latency crossover).** Plot INP against network latency for the htmx+genX+domx arm and the fastest CSR arm at each latency level. Fit a linear interpolation to each curve and report the latency at which they intersect. If they do not intersect within the measured range (0-300ms), report that the crossover, if it exists, is above 300ms RTT. Descriptive only.

**H11 (code-style scaling).** Plot server response time against payload size, one curve each for Arms 7, 8, and 9. Visually inspect whether the gap grows with payload size and whether Arm 8 tracks Arm 7 or Arm 9. Descriptive only.

**H13 (genX client overhead).** Plot ScriptDuration per interaction for Arms 10 and 11 at each payload size. Arm 11 runs genX formatting on each htmx swap; Arm 10 delivers pre-formatted HTML. Report the difference and whether it exceeds 5ms. Descriptive only.

### Robustness checks

- Trim the top and bottom 5% of runs per condition and re-run the confirmatory analysis on the trimmed data.
- Report results for both the full and trimmed datasets. If they disagree, report both and discuss.

### What we will report regardless of outcome

- All 82,500 data points, deposited as CSV in the replication package.
- Median and IQR for every metric, condition, and arm.
- The tuning-time log.
- Any arm that exceeded its tuning budget.
- Any condition where the CV exceeded 0.30 and additional runs were collected.
- The implementation-order randomization.

## 6. Replication package

Two Zenodo deposits, each assigned its own DOI:

**Pre-collection deposit** (before any measured run):

- This preregistration document
- The frozen task specification
- Source code for all eleven arms of all five archetypes
- The data generation script and all generated JSON files
- The Playwright benchmark harness
- The tuning-time log
- The implementation-order randomization

**Post-collection deposit** (before the paper is submitted):

- The analysis script (R or Python)
- Raw data (CSV, all 75,000+ runs)
- Any preregistered deviations logged during data collection
- A link to the pre-collection deposit DOI

## 7. Conflict of interest statement

The study author created and maintains the stateless, domx, and genX libraries, has a commercial interest in the DATAOS architecture through the multicardz product, and is the author of the Honest Code book whose principles govern the server-side code in Arms 6, 7, and 11. Both DATAOS and Honest Code are under study, so the conflict applies to both variables. This preregistration, the tuning budget, the use of library-maintained reference patterns, the conventional-React control arm (Arm 9), the domain-class ablation arm (Arm 8), the implementation freeze with pre-collection Zenodo deposit, and the commitment to deposit all raw data are the instruments for managing that conflict.

## Sources

- Clapton, J., Bastos, H., Batisteli, J. P. O., Seufitelli, D. B., and Tavares, C. (2025). Client-Side vs Server-Side Rendering: Impacts on Performance and User Experience in Web Applications. SBQS 2025, 165-172.
- Ollila, R., Makitalo, N., and Mikkonen, T. (2022). Modern Web Frameworks: A Comparison of Rendering Performance. Journal of Web Engineering 21(3), 789-814.
- Vepsalainen, J., Hellas, A., and Vuorimaa, P. (2024). Overview of Web Application Performance Optimization Techniques. arXiv:2412.07892.
- Vepsalainen, J., Hellas, A., and Vuorimaa, P. (2023). The State of Disappearing Frameworks in 2023. WEBIST 2023, 232-241.
- Chen, K. (2025). Improving Front-end Performance through Modular Rendering and Adaptive Hydration in React Applications. arXiv:2504.03884.
