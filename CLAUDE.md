# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this workspace is

`~/dev/perf` holds the four projects that make up the DATAOS ecosystem. Each subdirectory is an independent git repo with its own CLAUDE.md. The top-level directory is not a repo.

**DATAOS** (DOM As The Authority On State) is an architecture that treats the DOM as the single source of application state instead of maintaining a shadow state layer in JavaScript. The libraries below make that practical.

## Projects and their relationship

| Project | What it is | Language | npm name | Site |
|---|---|---|---|---|
| **domx** | Core DOM state observer: collect, apply, observe, persist | JS + TS types | `domx-dataos` | domx.software |
| **genX** | Declarative HTML behavior via attributes (`fx-*`, `ax-*`, `dx-*`, etc.) | JS (esbuild) | `genx-dataos` | genx.software |
| **stateless** | React hooks that read state from DOM instead of useState | TypeScript | `stateless-dataos` | stateless.software |
| **dataos-site** | Static marketing/book site for the DATAOS philosophy | HTML/CSS/JS | n/a | dataos.software |

The dependency chain is: **stateless** depends on **domx**. **genX** uses domx through a bridge (`src/domx-bridge.js`) that falls back to a native MutationObserver when domx is absent. **dataos-site** is standalone static content.

## Build and test commands

### domx

```bash
cd domx
npm run build          # esbuild via scripts/build.js → dist/
npm test               # vitest + typecheck
npm run test:watch     # vitest watch mode
npm run test:coverage  # vitest with coverage
npm run lint           # eslint
npm run size           # size-limit (budget: 2KB for dist/domx.js)
```

### genX

```bash
cd genX
npm run build          # esbuild bootloader + cloak + modules → dist/, then terser + gzip
npm test               # jest unit + cucumber BDD
npm run test:unit      # jest only (config/jest.config.js)
npm run test:browser   # playwright (config/playwright.config.js)
npm run test:bdd       # cucumber-js (config/cucumber.js)
npm run test:critical  # unit + BDD ci profile
npm run dev            # python3 http server on :8080
npm run lint           # eslint
```

Single BDD feature: `npx cucumber-js --config config/cucumber.js tests/features/<name>.feature`

### stateless

```bash
cd stateless
npm run build          # tsc → dist/
npm test               # vitest (jsdom)
npm run test:watch     # vitest watch mode
npm run lint           # tsc --noEmit
```

### dataos-site

No build step for the main site. Blog posts are markdown rendered client-side by marked.js. The Render deploy config runs `node scripts/build-blog.js` for blog index generation. Locally, serve with any static server.

## Architecture notes worth knowing

**domx's single MutationObserver.** All observation in domx funnels through one MutationObserver on `document.body`. The observer's attribute filter is the union of what live subscribers read. `observe()` narrows per-callback. `on()` widens the shared observer to all attributes for the duration of its subscription.

**The wipe race.** The sharpest edge in domx: if the server's response HTML does not preserve a mutation you made client-side, the swap wipes it. The fix is `serverOwned: true` on manifest entries the server owns, plus explicit persist-then-refresh for user actions on server-owned state. See domx README for the full explanation.

**genX bootloader pattern.** The bootloader (~1KB) scans the DOM for genX attribute prefixes and dynamically loads only the modules needed. Each module (fmtx, accx, bindx, dragx, loadx, navx, tablex, smartx) registers through `domx-bridge.js` for centralized DOM observation.

**stateless hook delegation.** All four exported hooks (`useDomState`, `useDomValue`, `useDomArray`, `useDomMap`) delegate to `useDomState`, which wraps domx's `collect()` and `observe()` in React's effect lifecycle.

## Deployment

- **dataos-site**: Netlify (static, SPA redirects) and Render (static, SPA rewrite)
- **genX site**: Render (static from `./site/`)
- **domx and stateless**: npm packages, not deployed as sites

## Terminology

- **DATAOS** — always uppercase
- **multicardz** — always lowercase (trademark); the production app built on DATAOS
- **domx**, **genX**, **stateless** — use these exact casings
