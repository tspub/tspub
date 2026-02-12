# Build

tspub uses [esbuild](https://esbuild.github.io) under the hood for fast, zero-config builds.

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

### Named Entries

For multiple entry points, use named entries:

```typescript
export default {
  build: {
    entry: {
      index: "src/index.ts",
      cli: "src/cli.ts",
      worker: "src/worker.ts",
    },
  },
};
```

Or via CLI:

```bash
tspub build --entry "index=src/index.ts,cli=src/cli.ts"
```

Named entries produce matching output filenames (`dist/index.js`, `dist/cli.js`, etc.).

### Auto-Splitting

When building multiple entry points as ESM, code splitting is automatically enabled. Shared code between entries is extracted into separate chunks to avoid duplication. You can override this with `splitting: false`.

## Output

```
dist/
├── index.js         # ESM
├── index.d.ts       # Type declarations
├── index.cjs        # CJS (if enabled)
└── index.d.cts      # CJS declarations (if enabled)
```
