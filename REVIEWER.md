# Reviewer Guide

You are reviewing the two conventional control arms of a 13-arm benchmark. The question is whether these arms faithfully represent how a competent developer would build each application using conventional patterns. Are they sandbagged, gold-plated, or missing an obvious optimization?

## What to review

### Arm 9: conventional React SSR

Context providers, custom hooks, domain model classes, component hierarchy. One directory per archetype:

- `apps/table/9-react-ssr-conventional/`
- `apps/dashboard/9-react-ssr-conventional/`
- `apps/browser/9-react-ssr-conventional/`
- `apps/form/9-react-ssr-conventional/`
- `apps/grid/9-react-ssr-conventional/`

Each contains `App.jsx` (component tree), `server.jsx` (SSR entry), `models.js` (domain classes), `patterns.jsx` (React patterns: context, hooks), and `index.jsx` (client hydration).

### Arm 13: conventional Node + htmx + EJS

Domain model classes, service layers, controller classes. Same five archetypes:

- `apps/table/13-htmx-ejs-conventional/`
- `apps/dashboard/13-htmx-ejs-conventional/`
- `apps/browser/13-htmx-ejs-conventional/`
- `apps/form/13-htmx-ejs-conventional/`
- `apps/grid/13-htmx-ejs-conventional/`

Each contains `server.js` (classes and route handlers) and `views/*.ejs` (EJS templates, identical to Arm 10).

### Supporting context

These files define what each archetype does and how measurements work. Read them to judge whether the arms implement the specification faithfully:

- `task-specification.md` — what each archetype must do (CRUD operations, interactions, data shapes)
- `preregistration.md` — study design, hypotheses, measurement protocol
- `apps/lib/` — shared libraries used by all arms (SQLite access, timing, HTTP utilities)
- `shared/styles.css` — shared stylesheet (all arms render the same visual output)

### What is out of scope

Everything else: Arms 1-8, Arms 10-12, the harness (`harness/`), the build system, data generation, vendor libraries, and the treatment arms that use DATAOS, genX, or Honest Code patterns. You are reviewing only whether the conventional controls are fair.

## How to review

1. Read `task-specification.md` to understand what each archetype must do.
2. For each archetype in Arms 9 and 13, check:
   - Does the code implement the specified behavior?
   - Are the patterns idiomatic for a competent developer using these tools?
   - Is anything conspicuously slow that a reasonable developer would optimize?
   - Is anything conspicuously over-optimized beyond what a typical project would do?
3. Write your findings in a report. The report ships with the paper in the replication package.

## Running the code

```bash
npm install              # from apps/
node server.js           # starts on http://localhost:4000

# Example URLs:
# http://localhost:4000/table/9-react-ssr-conventional/?rows=1000
# http://localhost:4000/table/13-htmx-ejs-conventional/?rows=1000
```

Arm 9 requires a build step first: `node build.js` from `apps/`. Arm 13 runs directly (server-rendered EJS, no build).
