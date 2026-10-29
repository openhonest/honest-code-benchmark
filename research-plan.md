# Research plan: benchmarking alternatives to conventional web application design

Oct 24, 2026 · @Adam Wasserman

An outline for an empirical study comparing alternatives to conventional web application design. The study measures performance differences across client-side state management, server-side code structure, and rendering mode. Every design choice below answers one objection: that the architecture was benchmarked by its own author.

## Separate the claims by instrument

Four claims are presented together on the project sites, and each one needs a different kind of evidence.

| Claim | Kind of claim | Instrument |
| --- | --- | --- |
| Bundle size (domx 2.2KB, stateless under 1KB, genX 1KB) | Descriptive | A census of built artifacts across matched applications |
| Load and interaction performance (5x faster to interactive, under 16ms operations) | Comparative | A controlled benchmark |
| Zero sync bugs | Half analytic, half empirical | A proof plus a defect prevalence study |
| multicardz production figures (1M+ cards, sub-100ms interactions) | Single case | A case report |

### What the single case can and cannot do

One production system cannot establish that DOM-as-state caused the performance. Too many other things differ between multicardz and any comparison application.

It can refute the claim that a client-side state tree is necessary for an application of that size and interaction rate. A single counterexample is enough to refute a necessity claim, and it is never enough to establish a causal one.

Claim the refutation. Do not claim the cause.

## Study 1: the matched implementation benchmark

The same application built several ways, which is the design Clapton et al. used for the CSR and SSR comparison.

**Task specification first.** Write the functional requirements before any implementation exists, and freeze them. Every arm builds to the same specification.

**Archetypes.** Three to five, chosen to span the payload range: form-heavy, table-heavy, dashboard, and one at the million-row end.

**Arms.** React useState, Redux, Zustand, a signals library, and stateless/domx.

**Framework held constant** across arms wherever possible. Ollila, Mäkitalo, and Mikkonen found rendering performance gaps of several orders of magnitude between Angular, React, Vue, Svelte, and Blazor on the same task. A framework difference would swamp any state-management effect.

**Payload sizes.** Five, spanning three orders of magnitude. Clapton et al. found the CSR and SSR ranking flips with data size, so a single payload measures one point on a curve.

**Measures.** Gzipped and parsed bundle size, TTFB, FCP, LCP, TTI, INP, total blocking time, and peak heap. INP matters most here, because hydration cost is paid after load.

**Environments.** At least two device classes and two network profiles. Device and network are the inputs any contextual selection policy takes, and a lab that fixes them removes the variable under study.

**Runs and analysis.** Enough runs for dispersion, dispersion reported, Kruskal-Wallis or Mann-Whitney. Browser timing is not normally distributed and the nonparametric test is the right default.

## The baseline tuning problem, and preregistration

A benchmark only proves something if the comparison arms were built as well as the favored one. An author who writes both arms will write one of them better, whatever the intent.

Three answers, weakest to strongest.

1. Use reference implementations published by each library's own maintainers.
2. Fix a tuning budget per arm in advance, and report what was spent on each.
3. Have an independent programmer write the comparison arms without knowing the hypothesis.

### Preregistration

Register the design, hypotheses, metrics, and analysis plan on OSF before collecting any data.

There is a public theoretical position behind this architecture and a commercial interest in how the numbers come out. Preregistration is the only instrument that answers that objection, and it answers it completely. Without it, every result gets discounted by any reader who finds the project sites.

The preregistration also forces the task specification to exist before the implementations, which the design needs anyway.

## Study 2: the defect prevalence study

The zero-sync-bugs claim has two halves, and they need different treatment.

**Elimination is analytic.** One copy of state means nothing can desynchronize. Write it as a short proof. Measuring it would be a category error, and a reviewer would say so.

**Prevalence is empirical, and more interesting.** Mine the issue trackers of large React and Redux projects for defects classified as state desynchronization. Report the rate, the time to fix, and the severity distribution. Code the sample twice, by two people, and report agreement, because the classification is the whole study.

Published together, the two halves say: this defect class is a measured share of defects in the comparison population, and this architecture cannot produce it.

That is a stronger and more honest result than any benchmark, and it is the one that matches an elimination argument rather than a mitigation argument.

## The framing that would get cited

Not "domx beats Redux." A library comparison gets read by the people already arguing about libraries.

The rendering literature treats hydration cost as a property of server-side rendering. Every strategy in that literature assumes a client-side component tree exists, and argues only about when to build it and how much of it to hydrate. Qwik's resumability goes furthest, and it still serializes a component tree.

This architecture separates hydration cost from the rendering mode. A study that measures hydration cost at three levels of client-side state, holding the rendering mode fixed, says something the field does not currently have.

Framed that way, the empirical arm becomes a contribution to the rendering literature rather than a product benchmark.

## Outputs

- [ ] Task specification, written and frozen
- [ ] Preregistration on OSF
- [ ] Replication package: code, data, and harness, deposited with a public DOI
- [ ] Paper 1, the benchmark
- [ ] Paper 2, the defect study

Venue options: the Journal of Web Engineering published Ollila et al., WEBIST published the Vepsäläinen series, and Software: Practice and Experience takes work of this kind.

## Sources

- [Clapton, J., Bastos, H., Batisteli, J. P. O., Seufitelli, D. B., and Tavares, C. (2025). Client-Side vs Server-Side Rendering: Impacts on Performance and User Experience in Web Applications. SBQS 2025, 165–172](https://sol.sbc.org.br/index.php/sbqs/article/view/39005)
- [Ollila, R., Mäkitalo, N., and Mikkonen, T. (2022). Modern Web Frameworks: A Comparison of Rendering Performance. Journal of Web Engineering 21(3), 789–814](https://journals.riverpublishers.com/index.php/JWE/article/view/7217)
- [Vepsäläinen, J., Hellas, A., and Vuorimaa, P. (2024). Overview of Web Application Performance Optimization Techniques. arXiv:2412.07892](https://arxiv.org/pdf/2412.07892)
- [Vepsäläinen, J., Hellas, A., and Vuorimaa, P. (2023). The State of Disappearing Frameworks in 2023. WEBIST 2023, 232–241](https://www.scitepress.org/Papers/2023/121740/121740.pdf)
- [Chen, K. (2025). Improving Front-end Performance through Modular Rendering and Adaptive Hydration in React Applications. arXiv:2504.03884](https://arxiv.org/abs/2504.03884)
