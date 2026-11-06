# Implementation Time Log

This log records implementation and tuning time for each arm in the benchmark study. It is committed to the replication package as required by the preregistration document.

## Method

Time was extracted from Claude Code session transcripts stored in `~/.claude/projects/-Users-adam-dev-perf/`. One session (`72d8600d`) contains all real work; 17 other transcript files are automated stop-check subagents (33 lines each, no implementation work).

Active time was computed by summing inter-event gaps of 10 minutes or less within the transcript. Gaps longer than 10 minutes mark a new work session. When a session touched multiple arms (build fixes, cross-arm audits), its active time was split equally among the arms touched.

## Per-arm time

| Arm | Active time | Notes |
|-----|------------|-------|
| 1-useState | 32m | CSR, React hooks |
| 2-redux | 32m | CSR, Redux Toolkit |
| 3-zustand | 32m | CSR, Zustand |
| 4-signals | 32m | CSR, Preact Signals |
| 5-stateless-domx | 37m | CSR, stateless + domx |
| 6-react-ssr-stateless-domx | 16m | SSR, stateless + domx + SQLite paging |
| 7-react-ssr-honest | 41m | SSR, Honest Code patterns |
| 8-react-ssr-domain-classes | 25m | SSR, domain classes only |
| 9-react-ssr-conventional | 41m | SSR, conventional OOP (React) |
| 10-htmx-ejs | 39m | SSR, htmx + EJS, Node |
| 11-fastapi-honest-htmx | 38m | SSR, htmx + Jinja2, FastAPI, Honest Code + genX |
| 12-fastapi-honest-nogenx | 4m | SSR, htmx + Jinja2, FastAPI, Honest Code, no genX |
| 13-htmx-ejs-conventional | 5m | SSR, htmx + EJS, Node, conventional OOP |

## Shared work (not attributed to a single arm)

| Category | Active time | Share of total |
|----------|------------|----------------|
| Infrastructure (harness, shared libs, servers, build) | 221m | 32.9% |
| Documentation (preregistration, task spec, study design) | 273m | 40.6% |
| Other (discussion, review, planning) | 11m | 1.7% |

## Summary

- **Total active time**: 11.2 hours (672 minutes)
- **Median per-arm time**: 32 minutes
- **Outlier threshold (2x median)**: 64 minutes
- **Outliers**: none

## Work sessions

| # | Date | Time (UTC) | Active | Arms touched | Category |
|---|------|------------|--------|-------------|----------|
| 1 | 2026-10-25 | 21:44-22:30 | 46m | (none) | infra, docs |
| 2 | 2026-10-25 | 22:43-22:47 | 4m | (none) | docs |
| 3 | 2026-10-25 | 23:27-23:38 | 11m | (none) | docs |
| 4 | 2026-10-26 | 02:04-02:26 | 22m | (none) | docs |
| 5 | 2026-10-28 | 19:16-19:19 | 3m | (none) | docs |
| 6 | 2026-10-28 | 20:15-21:00 | 45m | (none) | infra, docs |
| 7 | 2026-10-28 | 21:52-22:13 | 21m | (none) | infra, docs |
| 8 | 2026-10-29 | 14:22-16:40 | 138m | 1, 2, 3, 4, 5, 7, 9 | impl, infra, docs |
| 9 | 2026-10-29 | 17:03-18:07 | 65m | 5, 6, 7, 8, 9, 10, 11 | impl, infra, docs |
| 10 | 2026-10-29 | 18:30-18:50 | 20m | 1-11 (all) | impl, infra, docs |
| 11 | 2026-10-29 | 19:42-20:00 | 18m | (none) | docs |
| 12 | 2026-10-29 | 21:33-22:14 | 15m | (none) | infra, docs |
| 13 | 2026-10-29 | 23:19-23:31 | 12m | 7, 8, 9, 10, 11 | impl, infra, docs |
| 14 | 2026-10-30 | 00:09-00:44 | 35m | 1-5, 7-11 | impl, infra, docs |
| 15 | 2026-10-30 | 01:11-01:38 | 28m | 1-4, 8, 10, 11 | impl, infra, docs |
| 16 | 2026-10-30 | 13:25-13:53 | 28m | 10, 11 | impl, infra, docs |
| 17 | 2026-10-30 | 15:06-15:12 | 6m | (none) | docs |
| 18 | 2026-10-30 | 19:30-19:37 | 6m | 6, 7, 8, 9, 10 | impl, infra, docs |
| 19 | 2026-10-30 | 20:48-21:04 | 16m | 1-11 (all) | impl, infra, docs |
| 20 | 2026-10-31 | 17:26-17:31 | 6m | 1-11 (all) | impl, infra, docs |
| 21 | 2026-11-04 | 23:58-00:14 | 17m | (none) | infra, docs |
| 22 | 2026-11-06 | 14:16-16:13 | 81m | (none) | infra, docs |
| 23 | 2026-11-06 | 17:09-17:26 | 17m | 1-13 (all) | impl, infra, docs |

Sessions 8, 9, 14, 15 (Oct 29-30) represent the bulk of arm implementation. Session 22 (Nov 6) was the redesign from 11 to 13 arms. Session 23 began Arms 12 and 13 implementation.

## Methodology notes

- All arms were implemented with Claude Code (AI-assisted development). The human author (Adam Wasserman) directed the work, reviewed output, and made design decisions.
- Arms 1-5 (CSR) share a common pattern and were implemented together.
- Arms 6-9 (React SSR) were implemented together, with Arm 8 receiving extra work during a refactoring session to separate domain-class patterns from the full conventional pattern in Arm 9.
- Arms 10-11 (htmx) required different server stacks (Node/Express vs. FastAPI) and were implemented separately.
- Arms 12-13 were added during the Nov 6 redesign. Arm 12 was derived from Arm 11 (remove genX, 4 minutes). Arm 13 was derived from Arm 10 (rewrite with conventional class/object patterns, 5 minutes). Both ran as parallel subagents.
- Infrastructure work (harness, shared libraries, build system) is substantial (33% of total time) because it serves all arms equally.
