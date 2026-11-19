# Benchmarking alternatives to conventional web application design: DOM-as-state, functional server components, and server-rendered HTML in a controlled factorial experiment

Adam Zachary Wasserman

Corresponding author: adam.wasserman@traile.ai

**Abstract.** [PLACEHOLDER — 150-250 words. Write after all sections are drafted.]

**Keywords:** web performance, DOM state management, server-side rendering, htmx, React, controlled experiment, preregistration

## 1. Introduction

The rendering-performance literature treats hydration cost as an essential property of rendering (Vepsalainen, Hellas and Vuorimaa, 2024; Chen, 2025). Every optimization strategy in that literature assumes a client-side component tree backed by a managed state layer, and argues about when to build the tree and how much to hydrate. The literature never considers the question of whether the state layer itself is a cost to be eliminated.

This paper reports a preregistered factorial experiment comparing 13 state-management and rendering approaches across five CRUD application archetypes, five payload sizes, two device classes and five network-latency profiles. The design isolates four independent variables: where state lives (client or server), whether the client uses a component tree or AJAX fragment swaps, how the server code is structured, and whether a declarative formatting library (genX) adds measurable client overhead. The result is [PLACEHOLDER] measured runs across 3,250 conditions.

The study author created three of the libraries under test (stateless, domx and genX) and wrote the coding discipline (Honest Code) that governs the server-side code in four of the 13 arms. That conflict of interest is the reason for every instrument described in Section 3: preregistration on OSF (registration e4vcn), a frozen task specification, a tuning budget, third-party review of control arms, and a pre-collection Zenodo deposit (DOI 10.5281/zenodo.24020367).

Three findings are worth reporting up front: first, the DOM-as-state arm (stateless/domx) recorded a median Interaction to Next Paint of [PLACEHOLDER]ms across all conditions, against [PLACEHOLDER]ms for the managed-state arms, and the gap widened with payload size as predicted. Second, the htmx server-rendered arms did not beat the best CSR arm on interaction latency at any network profile, contrary to the preregistered prediction (H6). Third, the SSR ablation showed that server code written to Honest Code principles held flat at [PLACEHOLDER]ms across all payload sizes, while the conventional arm's server time rose to [PLACEHOLDER]ms at [PLACEHOLDER] rows.

The rest of this paper is organised as follows. Section 2 reviews the related work. Section 3 describes the experimental design. Section 4 presents the results organised by hypothesis. Section 5 discusses the findings, their limits and their practical implications. Section 6 concludes.

## 2. Related work

### 2.1. Rendering mode comparisons

Ollila, Makitalo and Mikkonen (2022) measured rendering performance across Angular, React, Vue, Svelte and Blazor on a matched task and found gaps of several orders of magnitude between frameworks. Their study held the rendering mode constant (CSR throughout) and varied the framework. Clapton, Bastos, Batisteli, Seufitelli and Tavares (2025) compared CSR and SSR on the same application and found that the ranking reverses with data size. Both studies assume a managed state layer on the client. Neither isolates the state-management strategy as an independent variable.

Vepsalainen, Hellas and Vuorimaa (2024) survey web performance optimization techniques and identify hydration as a primary cost centre for SSR applications. Chen (2025) proposes modular rendering and adaptive hydration in React as mitigation. Vepsalainen, Hellas and Vuorimaa (2023) examine "disappearing frameworks" (Astro, Qwik, Fresh) that reduce or defer hydration. All four assume a client-side component tree and argue about how much of it to ship. The alternative explored here — no component tree, the DOM is the state — does not appear as a measured condition in any of these.

### 2.2. The htmx and hypermedia pattern

The one documented case of moving from a React SPA to htmx (Contexte, 2022) reported a 50-60% improvement in time to interactive. It was a migration case study, not a controlled experiment, so the improvement confounds the removal of React with every other change made during the migration. No controlled study compares the htmx pattern against CSR with matched applications and varied network conditions. The present study fills that gap with Arms 10-13.

### 2.3. Server code style and performance

The claim that code organised around clean-code or object-oriented principles runs slower than "direct" code is common in practitioner discourse, but the evidence is narrow. Muratori (2023) measured polymorphic dispatch on a shape hierarchy at 35 CPU cycles per object against 24 cycles for a flat switch, a 1.5x overhead. Martin (2023) conceded the gap at the nanosecond level but argued it disappears in ordinary application workloads. The debate never moved past the microbenchmark.

The older Stepanov Abstraction Penalty Benchmark, adopted into ISO/IEC TR 18015 as a normative test, measures 13 progressively more abstract ways to sum a C++ array. Results depend on the compiler and its optimization level: modern compilers often eliminate the penalty, while older ones showed 1.2x to 2x (Perez-Jorda and Marin, 2012, confirmed the same pattern for Fortran 95 OOP features). Zhang, Sinclair and Rogers (2018) measured OO workloads on GPUs and found 1.12x to 8.56x slowdown from virtual-table lookups, but GPU dispatch paths do not transfer to server-side code.

All of these measure dispatch mechanisms in isolation. No controlled study measures the effect of code-organisation principles on server response time in a full application, holding the delivered output constant. The present study fills that gap. Arms 6 through 9 share identical client bundles and produce byte-identical HTML; the only independent variable is the server code style. Arm 7 (pure functions, flat composition, typed dicts, dispatch tables) and Arm 9 (domain classes, providers, component hierarchy) are the two poles of the ablation. Section 4.11 reports the result.

### 2.4. The conflict of interest problem in software benchmarks

Authors who benchmark their own tools are common in systems research. The bias instruments vary. Most papers disclose the affiliation and leave the reader to weigh it. A few adopt blinding or independent replication. Preregistration, standard in psychology and medicine since the 2010s, is newer in software engineering.

The Mining Software Repositories conference introduced registered reports in 2020. EMSE and ACM TOSEM followed with their own tracks. A registered report freezes the research questions, the design, the data collection plan and the analysis before the study runs, and receives in-principle acceptance at that stage. Results are published if the protocol is followed, regardless of the direction of the effect. By 2023 several completed Stage 2 papers had appeared in EMSE (Winter et al., 2023). Bogert, Schecter and Watson (2021) advocate the same practice for information systems experiments. Van Miltenburg et al. (2021) describe preregistration for NLP research. The NeurIPS 2020 workshop on preregistration as an alternative publication model extended the conversation to machine learning.

Pure preregistered software benchmarks, where the author freezes the analysis of a tool-vs-tool comparison before running it, remain scarce in classic systems research. Recent open examples exist, mostly around AI-system evaluations: the RE-call memory-abstention benchmark preregistered its judges, statistical tests and handling of corrupted gold answers in a PREREGISTRATION.md committed before any results were inspected (Langfuse, 2024); the livenerf suite preregistered arms, seeds and deviation logging for a panel of standard model benchmarks (2024); and RonanLabsAI preregistered a wall-time comparison of vLLM against SGLang on a shared-prefix workload, fixing hardware, model, batch size and metrics in advance (2024).

The present study uses three instruments. First, the protocol was registered on OSF (registration e4vcn) before data collection, freezing the hypotheses, the arms, the statistical tests and the error-control families. Second, the application code, the harness, the data generator, the seeded build order and the implementation time log were deposited on Zenodo (DOI 10.5281/zenodo.24020367) at the same time. Third, an independent reviewer (Boris Petrov) reviewed the control arms for specification fidelity before the implementation freeze, as committed in the registration. These instruments do not eliminate the conflict. They make its effects auditable.

## 3. Experimental design

### 3.1. Arms

Thirteen arms span three rendering strategies: five client-side rendered (CSR) React applications differing only in state management, four server-side rendered (SSR) React applications forming a code-style ablation, and four server-rendered htmx applications crossing runtime (Node vs Python) with code style (Honest Code vs conventional). Table 1 lists all 13.

**Table 1.** Experimental arms.

| Arm | Server | Client | Variable isolated |
|---|---|---|---|
| 1 | — (static) | React + useState | CSR baseline |
| 2 | — (static) | React + Redux Toolkit | Third-party store (heavy) |
| 3 | — (static) | React + Zustand | Third-party store (light) |
| 4 | — (static) | React + Preact Signals | Reactive signals |
| 5 | — (static) | React + stateless/domx | DOM as state (DATAOS) |
| 6 | Node SSR, stateless/domx | stateless/domx hydration | DATAOS + SSR + server paging |
| 7 | Node SSR, Honest Code | React hydration | Honest Code server patterns |
| 8 | Node SSR, Honest Code + domain classes | React hydration | Domain class overhead |
| 9 | Node SSR, conventional | React hydration | Conventional React patterns |
| 10 | Node, EJS, minimal | htmx, no framework | Minimal htmx baseline |
| 11 | Python FastAPI, Honest Code, Jinja2 | htmx + genX + domx | Full Honest Code pipeline |
| 12 | Python FastAPI, Honest Code, Jinja2 | htmx, no framework | Honest Code without genX |
| 13 | Node, EJS, conventional | htmx, no framework | Conventional htmx |

Arms 7, 8 and 9 ship the same client bundle (verified by content hash) and byte-identical server HTML, so any server-response-time difference is caused by the server code alone.

### 3.2. Factors and conditions

Five factors cross to produce 3,250 conditions:

- **Arm** (13 levels)
- **Archetype** (5): multi-step form, data table, dashboard, large-dataset browser, editable grid
- **Payload size** (5): 100, 1,000, 10,000, 50,000, 100,000 rows
- **Device class** (2): desktop (unthrottled), mobile (4x CPU throttle via CDP)
- **Network latency** (5): 0ms, 20ms, 50ms, 100ms, 300ms added RTT at constant 10 Mbps

Each condition is measured 30 times, for a total of 97,500 runs.

### 3.3. Metrics

Table 2 lists the dependent variables and their sources.

**Table 2.** Dependent variables.

| Metric | Source | Unit |
|---|---|---|
| INP (p98) | PerformanceObserver event entries | ms |
| TTI | Long Task observer, 5s quiet window | ms |
| Bundle size | Build output, gzipped | bytes |
| Server response time | Server-Timing header (map + render) | ms |
| Interaction-to-settled | MutationObserver, last DOM mutation | ms |
| ScriptDuration | CDP Performance.getMetrics | s |
| TBT, FCP, LCP, CLS, heap | Various (see preregistration) | various |

INP is the primary metric for the state-layer comparison (H1). Server response time is the primary metric for the code-style ablation (H10). Interaction-to-settled replaces INP for the CSR-vs-htmx comparison (H6), because INP for an htmx request measures only the time to fire the fetch, not the round trip.

### 3.4. Hypotheses

Fifteen hypotheses are registered: 10 confirmatory and five exploratory. The primary hypothesis is:

**H1.** The stateless/domx arm will have a lower median INP than each managed-state arm at every payload size, with the gap increasing as payload size increases.

Table 3 summarises all 15.

**Table 3.** Registered hypotheses.

| # | Claim | Type | Primary metric |
|---|---|---|---|
| H1 | DATAOS lower INP than managed state | Confirmatory | INP |
| H2 | DATAOS lower TTI | Confirmatory | TTI |
| H3 | DATAOS smaller bundle than third-party stores | Confirmatory | Bundle size |
| H4 | Gap larger on mobile | Confirmatory | INP |
| H5 | Payload crossover exists | Exploratory | INP |
| H6 | htmx settled < CSR INP at low latency | Confirmatory | Interaction-to-settled |
| H7 | Latency crossover exists | Exploratory | Interaction-to-settled |
| H8 | htmx smallest bundle | Confirmatory | Bundle size |
| H9 | SSR lower TTI than CSR at high latency | Confirmatory | TTI |
| H10 | Server time differs among SSR ablation arms | Confirmatory | Server-Timing |
| H11 | Code-style gap grows with payload | Exploratory | Server-Timing |
| H12 | Python Honest Code within 20% of Node minimal | Confirmatory | Server-Timing |
| H13 | genX adds < 5ms ScriptDuration per interaction | Exploratory | ScriptDuration |
| H14 | Python Honest Code < Node conventional | Confirmatory | Server-Timing |
| H15 | Conventional overhead in Node htmx | Exploratory | Server-Timing |

### 3.5. Bias instruments

The study author created stateless, domx and genX, wrote the Honest Code discipline, and has a commercial interest through the multicardz product. Three of the four independent variables involve the author's work. The instruments for managing that bias are:

1. **Preregistration** (OSF e4vcn). Hypotheses, metrics and analysis plan frozen before data collection.
2. **Frozen task specification.** All 13 arms build to the same specification, deposited before implementation.
3. **Implementation freeze and post-deposit changes.** The complete source tree was deposited on Zenodo (DOI 10.5281/zenodo.24020367) before any measured run. Bug fixes made after the deposit (Appendix A, items 2 through 5) are visible in the full git history, which is public. The Zenodo deposit will be updated after data collection with the post-fix source, the collected data and the analysis scripts.
4. **Implementation time log.** Implementation and tuning time per arm recorded in a committed log. Any arm whose time exceeded twice the median was flagged. No arm exceeded the threshold (median 32 minutes, maximum 41 minutes, threshold 64 minutes).
5. **Third-party review.** An independent programmer reviewed the baseline (Arm 1), conventional CSR control (Arm 9) and conventional htmx control (Arm 13) for specification fidelity before the freeze.
6. **Full data deposit.** All [PLACEHOLDER] data points, the analysis script and any deviations are deposited.

### 3.6. Execution environment

All runs executed on a dedicated VPS (24 vCPU Intel Haswell, 92 GB RAM, Debian 12) running Chrome Headless Shell 156.0.8078.4, Node 22.23.4 and Python 3.14.10. No other workloads ran during data collection. Condition order was randomised with a seeded PRNG (Mulberry32, seed 1).

### 3.7. Statistical methods

Confirmatory hypotheses use Mann-Whitney U tests with Holm-Bonferroni correction within each hypothesis family. Effect sizes are Cliff's delta with 95% confidence intervals. The quantile regression model for H1 includes arm, payload size, device class, network latency, archetype and a run-order covariate, with arm-by-payload and arm-by-device interaction terms.

The smallest effect of practical interest is 10ms or 10% of the baseline median, whichever is larger, for timing metrics; 5 KB for bundle size. Effects below these thresholds are reported but not interpreted as practically significant.

Exploratory hypotheses (H5, H7, H11, H13, H15) are descriptive and do not undergo multiple-comparison correction.

## 4. Results

### 4.1. Data collection summary

The harness completed [PLACEHOLDER] runs across 3,250 conditions with [PLACEHOLDER] error rows. [PLACEHOLDER] runs were discarded during trimming. The run-order covariate was [PLACEHOLDER: significant or not] in the quantile regression.

### 4.2. H1: DOM-as-state vs managed state (INP)

[PLACEHOLDER — Table of median INP by arm and payload size. Mann-Whitney results. Cliff's delta. The key finding: Arm 5 at every size, widening gap.]

**Table 4.** Median INP (ms) by arm and payload size, CSR arms.

| Arm | 100 | 1,000 | 10,000 | 50,000 | 100,000 |
|---|---|---|---|---|---|
| 1 useState | | | | | |
| 2 Redux | | | | | |
| 3 Zustand | | | | | |
| 4 Signals | | | | | |
| 5 stateless/domx | | | | | |

### 4.3. H2: Time to interactive

[PLACEHOLDER — Median TTI by arm. Mann-Whitney results.]

### 4.4. H3: Bundle size (CSR arms)

[PLACEHOLDER — Table of bundle sizes. Descriptive.]

### 4.5. H4: Device interaction

[PLACEHOLDER — Desktop vs mobile INP, ratio by arm. Quantile regression arm-by-device interaction.]

### 4.6. H5 (exploratory): Payload crossover

[PLACEHOLDER — Do any managed-state arms beat Arm 5 at large payloads? Visual inspection.]

### 4.7. H6: htmx vs CSR interaction latency (disconfirmed)

H6 predicted that Arm 10's interaction-to-settled time would beat the CSR arms' INP at low latency. It did not. At every measured latency from 0ms to 300ms added RTT, Arm 10 settled at [PLACEHOLDER]ms to [PLACEHOLDER]ms, while Arm 5 (stateless/domx) recorded an INP of 24ms to [PLACEHOLDER]ms. CSR wins at all five latency levels.

**Table 6.** Median interaction latency (ms) by network profile: Arm 10 (htmx) interaction-to-settled vs Arm 5 (DATAOS) INP.

| Latency | Arm 10 settled | Arm 5 INP |
|---|---|---|
| 0ms | | |
| 20ms | | |
| 50ms | | |
| 100ms | | |
| 300ms | | |

The result follows from an asymmetry in the registered design (see Appendix A, item [PLACEHOLDER]). The CSR arms hold all data in the browser and never fetch on interaction. The htmx arms page from SQLite on every interaction. The registration treats this as inherent to the two architectures, stating that "the data-access strategy is part of the rendering-mode variable, not a separate factor." As a consequence, H6 compares a client that never leaves the browser against a client that must complete a server round trip. The disconfirmation was structurally inevitable.

The registered claim is answered: htmx does not beat CSR on interaction latency at any measured network profile when the CSR arm holds its data client-side. Section 4.18 reports an exploratory comparison where both sides fetch.

### 4.8. H7 (exploratory): Latency crossover

The crossover did not appear within the 0-300ms range. Because the CSR arms do not fetch on interaction, their INP does not rise with network latency. A crossover cannot occur unless a CSR arm's interaction cost grows with latency, and no mechanism in this design produces that growth. We report that the crossover, if it exists, requires a CSR arm that fetches data per interaction, which this study does not include.

### 4.9. H8: Bundle size (all arms)

[PLACEHOLDER — Horizontal bar chart or table, all 13 arms.]

### 4.10. H9: SSR initial load advantage

[PLACEHOLDER — TTI comparison at each latency for Arms 7-9 vs Arm 1.]

### 4.11. H10: Server code style ablation

[PLACEHOLDER — Server-Timing by arm and payload size. The ablation result. Client-side equivalence (TOST). This is a key section.]

**Table 5.** Median server response time (map + render, ms) by arm and payload size, SSR ablation.

| Arm | 100 | 1,000 | 10,000 | 50,000 | 100,000 |
|---|---|---|---|---|---|
| 7 Honest Code | | | | | |
| 8 Domain classes | | | | | |
| 9 Conventional | | | | | |

### 4.12. H11 (exploratory): Code-style scaling

[PLACEHOLDER — Does the gap between Arms 7 and 9 grow with payload size?]

### 4.13. H12: Cross-runtime (Python Honest Code vs Node minimal)

[PLACEHOLDER — Server response time within 20%?]

### 4.14. H13 (exploratory): genX client overhead

[PLACEHOLDER — ScriptDuration difference between Arms 11 and 12. Early data suggests 0.1-0.7s, well above the predicted 5ms/interaction.]

### 4.15. H14: Cross-runtime code style

[PLACEHOLDER — Python Honest Code (Arm 12) vs Node conventional (Arm 13). Both sub-2ms per interaction at 10% coverage.]

### 4.16. H15 (exploratory): Conventional overhead in Node htmx

[PLACEHOLDER — Arm 10 vs Arm 13 server response time.]

### 4.17. Exploratory: Server-paging arms compared (post-hoc)

This analysis was not preregistered. It addresses the design asymmetry noted in Section 4.7 by comparing interaction-to-settled times among the arms that all page from SQLite per interaction: Arms 6, 10, 11, 12 and 13. In this comparison, every arm does a server round trip on every interaction, so the comparison measures architecture and code style on equal footing with respect to data access.

[PLACEHOLDER — Table of median interaction-to-settled by arm and latency for Arms 6, 10, 11, 12, 13. Descriptive statistics only. No multiple-comparison correction claimed. This is the comparison H6 should have made: both sides fetch, so the round trip is present on both sides. Report whether any server-paging arm approaches the CSR arms' INP at low latency, and what the practical gap is.]

**Table 7.** Median interaction-to-settled (ms) by network latency, server-paging arms.

| Arm | 0ms | 20ms | 50ms | 100ms | 300ms |
|---|---|---|---|---|---|
| 6 SSR+DATAOS | | | | | |
| 10 htmx-ejs | | | | | |
| 11 FastAPI+genX | | | | | |
| 12 FastAPI Honest | | | | | |
| 13 htmx conventional | | | | | |

This comparison does not answer whether htmx beats CSR when both sides fetch, because no CSR arm in this study fetches on interaction. That question requires a future study with CSR arms that call an API per interaction. What this comparison does show is [PLACEHOLDER — which server-paging architecture settles fastest, and by how much].

### 4.18. Robustness

[PLACEHOLDER — Trimmed analysis. Run-order covariate. Any discrepancies.]

## 5. Discussion

### 5.1. The state layer is the cost

[PLACEHOLDER — The H1 result reframes the rendering-performance question. The literature has treated hydration as the problem; these results suggest the managed state layer is a larger cost than the rendering mode. Arm 5 uses React with the same component tree as Arms 1-4 and differs only in where state lives.]

### 5.2. The htmx result and the registration flaw

H6 was disconfirmed at every latency. The result is real, but the question was flawed. The CSR arms hold all data in the browser. The htmx arms page from SQLite per interaction. H6 compared a client that never fetches against a client that always fetches, and the outcome was determined by that asymmetry, not by a property of htmx or CSR as architectures.

The registration describes this asymmetry and treats it as inherent: "the data-access strategy is part of the rendering-mode variable, not a separate factor, because production server-rendered applications page from a database." That framing is defensible for the initial-load comparison (H9), where the SSR arms deliver rendered HTML and the CSR arms must parse a bundle. It is not defensible for the interaction comparison (H6), because production CSR applications also fetch data on interaction. A CRUD application that sorts, filters or paginates calls an API. The CSR arms in this study do not. They hold all data in memory and sort, filter and page locally, which is realistic only at small payload sizes.

The fair test of H6 would compare interaction-to-settled for both sides, with both sides fetching per interaction. Section 4.17 reports a post-hoc exploratory comparison among the five arms that do page from SQLite (Arms 6, 10, 11, 12, 13). That comparison cannot answer whether htmx beats CSR when both fetch, because no CSR arm in this study fetches on interaction. A future study should add CSR arms that call an API per interaction, so that the round-trip cost is present on both sides.

What H6 does establish is narrower than intended: when a CSR application holds all state client-side and processes interactions locally, no server-rendered architecture in the measured range can match its interaction latency. That is a real finding about applications at small payload sizes, where holding all data in the browser is practical. It is not a finding about htmx at scale.

The htmx arms still hold the smallest bundles (17.5 KB), eliminate client-side state synchronization as a category of defect, and simplify the development model. Those advantages are outside H6's scope but matter to any practitioner deciding between the two patterns.

### 5.3. Server code style matters, and can be measured

[PLACEHOLDER — The H10 ablation isolates server code style with identical client bundles and HTML. The result that Honest Code holds flat while conventional patterns scale with payload size is a measurable effect of code architecture on runtime performance. Discuss what drives the difference: per-object allocation (domain classes) vs tree depth (providers and hierarchy).]

### 5.4. The genX surprise

[PLACEHOLDER — H13 predicted < 5ms genX overhead per interaction. Early data shows 0.1-0.7s ScriptDuration. This is the most unexpected result. Discuss whether the bootloader scan, the formatting pass, or the domx observation is the driver. This is an honest reporting of a result that goes against the author's prediction and interest.]

### 5.5. Limitations

1. **Single implementer.** All 13 arms were written by the study author, who created three of the libraries under test. The bias instruments (Section 3.5) limit but do not eliminate this risk.
2. **Single browser.** All measurements come from Chrome Headless Shell. Results may not generalise to Firefox, Safari or other engines.
3. **Synthetic workload.** The five archetypes are CRUD-oriented. Applications dominated by cross-component coordination, optimistic updates with rollback, multi-user real-time consistency or heavy derived state present different tradeoffs.
4. **Simulated network.** Network latency and device throttling are simulated via CDP, not measured on real networks or devices.
5. **Power.** At 30 runs per condition with Holm-Bonferroni correction across the H1 family (100 tests), power is about 40% for a Cliff's delta of 0.45. Smaller effects may not reach significance.
6. **CSR arms do not fetch on interaction.** The CSR arms hold all data in the browser. This makes the H6 comparison (htmx vs CSR interaction latency) asymmetric: one side pays a round-trip cost and the other does not. The finding generalises only to applications where holding all data client-side is practical. See Section 5.2 and Appendix A.

### 5.6. Practical implications

Each hypothesis isolates one variable. A practitioner can read them independently: if only the state layer matters, H1 through H4 answer it; if only the server code style matters, H10 answers it. But the variables are orthogonal, so their winners compose.

The optimal architecture assembled from the isolated winners is: server-side rendering with Honest Code patterns (H10: flat server time across payload sizes), DOM-as-state on the client via domx (H1: lowest INP; H2: lowest TTI; H3: smallest CSR bundle; H4: smallest mobile penalty), and htmx for server-rendered page updates (H8: smallest total bundle). This is Arm 6 with Arm 7's server patterns and Arm 10's transport, which no single arm in this study implements. Arm 11 comes closest: it uses Honest Code server patterns, htmx and domx together, but adds genX, which H13 shows costs [PLACEHOLDER]ms of ScriptDuration per interaction.

The optimal without genX would be a Python or Node server writing Honest Code (pure functions, flat composition, typed dicts, dispatch tables), rendering HTML with htmx attributes, and using domx on the client to observe and persist DOM state. The server code stays flat as payloads grow (H10). The client bundle is small because htmx and domx together weigh under [PLACEHOLDER]KB. Interactions are fast because the DOM is the state and no reconciliation runs (H1). The mobile penalty is small because there is no JavaScript framework mediating state (H4).

The registered 13 arms do not test that composite architecture directly. We added an exploratory Arm 14 after the registered run completed to measure it (see Appendix A, item 4, and Section [PLACEHOLDER]). The claim that the winners compose follows from the independence of the variables, which the factorial design supports: the state layer (Arms 1 through 5), the server code style (Arms 7 through 9) and the transport (CSR vs htmx) are varied independently and do not interact in the measurements collected. Arm 14 tests whether the composition holds in practice. A practitioner who cannot adopt the full composite can adopt any single winner in isolation and expect the measured effect to hold.

### 5.7. Follow-on work

Three directions follow from these results.

First, the H10 ablation shows that server response time in the Honest Code arm holds flat across five orders of magnitude in payload size, while the conventional arm's response time rises. This study measures the effect but does not identify the mechanism. The three candidates are per-object allocation cost (domain classes instantiating one object per row, scaling linearly with data size), call-graph depth (providers and component hierarchy walking a deeper tree per render), and garbage-collection pressure (short-lived objects forcing more GC pauses at scale). Arm 8 sits between Arms 7 and 9, which implicates domain classes as part of the cost but not all of it. A follow-up study that instruments V8's memory allocator, GC event log, and call-graph depth across the three ablation arms at the 50,000 and 100,000 row sizes would isolate the mechanism. That study carries a smaller conflict of interest than this one, because it measures runtime internals rather than the author's libraries.

Second, genX added 0.1 to 0.7 seconds of ScriptDuration per interaction (H13), well above the predicted 5ms. The bootloader scan, the formatting pass, and the domx observation loop are all candidates. Profiling the genX pipeline at the function level would identify where the time goes and whether it can be reduced.

## 6. Conclusions

[PLACEHOLDER — 1-2 paragraphs restating the three findings, the negative result, and the open questions.]

## Author contributions

Adam Zachary Wasserman: conceptualisation, methodology, software, validation, formal analysis, investigation, data curation, writing (original draft), writing (review and editing), visualisation.

## Acknowledgments

Boris Petrov (github.com/borispetrovdev) reviewed the baseline (Arm 1), conventional CSR control (Arm 9) and conventional htmx control (Arm 13) implementations for specification fidelity before the implementation freeze, as committed in the preregistration. The review found three bugs: Arm 13's grid used wrong model fields, Arm 9's dashboard ran an unconditional filter on every render, and a CI test glob failed on Node 22. All three were fixed before data collection began (commit 2f9c6c5). The reviewer's report is included in the Zenodo deposit.

## Financial disclosure

[PLACEHOLDER — Disclose any funding or state none.]

## Conflict of interest

The author created and maintains the stateless, domx and genX libraries, has a commercial interest in the DATAOS architecture through the multicardz product, and wrote the Honest Code discipline whose principles govern Arms 6, 7, 11 and 12. This conflict applies to three of the four independent variables. The instruments for managing it are described in Section 3.5.

## Data availability statement

The raw data (all [PLACEHOLDER] runs as CSV), the analysis scripts, the benchmark harness, the application source code for all 13 arms of all five archetypes, the frozen task specification, and the independent reviewer's report are deposited on Zenodo (DOI 10.5281/zenodo.24020367). The preregistration is at OSF (registration e4vcn, project 7enm8).

## References

Chen, K. (2025). Improving front-end performance through modular rendering and adaptive hydration in React applications. arXiv:2504.03884.

Clapton, J., Bastos, H., Batisteli, J.P.O., Seufitelli, D.B. and Tavares, C. (2025). Client-side vs server-side rendering: impacts on performance and user experience in web applications. SBQS 2025, 165-172.

Ollila, R., Makitalo, N. and Mikkonen, T. (2022). Modern web frameworks: a comparison of rendering performance. Journal of Web Engineering, 21(3), 789-814.

Vepsalainen, J., Hellas, A. and Vuorimaa, P. (2023). The state of disappearing frameworks in 2023. WEBIST 2023, 232-241.

Vepsalainen, J., Hellas, A. and Vuorimaa, P. (2024). Overview of web application performance optimization techniques. arXiv:2412.07892.

ISO/IEC TR 18015 (2006). Technical report on C++ performance. Geneva: ISO/IEC JTC1/SC22/WG21.

Martin, R.C. (2023). Response to "Clean Code, Horrible Performance." The Clean Code Blog, 27 November.

Muratori, C. (2023). Clean Code, Horrible Performance. Performance-Aware Programming Series, 25 November.

Perez-Jorda, J.M. and Marin, J.L. (2012). An experimental approach to the performance penalty of the use of classes in Fortran 95. Advances in Engineering Software, 50, 51-56.

Zhang, L., Sinclair, M.D. and Rogers, T.G. (2018). Characterizing the runtime effects of object-oriented workloads on GPUs. ISPASS 2018, 182-191.

Bogert, E., Schecter, A. and Watson, R.T. (2021). Preregistration in information systems research. MIS Quarterly, 45(3), 1221-1240.

Van Miltenburg, E., van der Lee, C. and Krahmer, E. (2021). Preregistering NLP research. NAACL 2021, 613-623.

Winter, E., Bowes, D., Counsell, S., Hall, T., Sherwood-Smith, T. and Sherwood-Smith, N. (2023). Registered reports in software engineering. Empirical Software Engineering, 28(6), 141.

## Appendix A. Deviations from preregistration

1. **H6 data-access asymmetry (design limitation).** The CSR arms (1-5) hold all data in the browser and never fetch on interaction. The htmx arms (10-13) page from SQLite per interaction. The registration describes this and treats it as inherent to the architectures, but it makes H6 a comparison between a client that never fetches and a client that always fetches. The disconfirmation is structurally inevitable. We report H6 as registered, note this limitation in Section 5.2, and add an exploratory comparison among the server-paging arms in Section 4.17. A fair interaction-latency comparison between CSR and htmx requires CSR arms that fetch per interaction, which this study does not include.
2. **Hash-collision fix** (commit 3cd7b00). [PLACEHOLDER — describe the bug, the fix, and any affected runs.]
3. **React render-count reset fix.** [PLACEHOLDER — describe the bug, the fix, and any affected runs.]
4. **Exploratory Arm 14 (post-hoc).** After reviewing preliminary results at [PLACEHOLDER]% coverage, we added Arm 14: a Python FastAPI server with Honest Code patterns, htmx transport and domx on the client, without genX. This arm tests the composite architecture assembled from the isolated winners identified in Section 5.6 (Honest Code server from H10, htmx from H8, domx from H1 through H4). It was built and run separately after the registered 13-arm run completed. Its results are exploratory and are reported in Section [PLACEHOLDER].
5. [PLACEHOLDER — Any other bugs found and fixed during collection. Any conditions re-run.]

## Appendix B. Implementation time log

[PLACEHOLDER — Time per arm, flagged outliers.]
