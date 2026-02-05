# Build

tspub uses [tsdown](https://tsdown.dev) (Rolldown-based) under the hood for fast, zero-config builds.

## Quick Start

```bash
tspub build
```

This outputs ESM + type declarations to `dist/`.

## What Gets Built

- **ESM** (`.js`) — default output format
- **CJS** (`.cjs`) — opt-in with `formats: ["esm", "cjs"]`
- **Type declarations** (`.d.ts`) — generated automatically
- **Sourcemaps** — opt-in with `sourcemap: true`

## Entry Detection

tspub auto-detects your entry point from `package.json`:

1. `exports["."].import` → uses that path's source equivalent
2. `main` field → uses that
3. Falls back to `src/index.ts`

Or specify explicitly:

```bash
tspub build --entry src/index.ts
```

## Output

```
dist/
├── index.js         # ESM
├── index.d.ts       # Type declarations
├── index.cjs        # CJS (if enabled)
└── index.d.cts      # CJS declarations (if enabled)
```
