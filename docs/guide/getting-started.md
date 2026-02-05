# Getting Started

## Installation

::: code-group

```bash [npm]
npm install -D tspub
```

```bash [pnpm]
pnpm add -D tspub
```

```bash [yarn]
yarn add -D tspub
```

:::

## Scaffold a New Package

```bash
npx tspub init my-package
cd my-package
npm install
```

This creates a fully configured TypeScript package with:
- `package.json` with correct `exports`, `type: "module"`, `files`, and scripts
- `tsconfig.json` tuned for library publishing
- `src/index.ts` entry point
- CI workflow for GitHub Actions
- LICENSE and README

## Build

```bash
npx tspub build
```

Outputs ESM + CJS + `.d.ts` to `dist/`. Powered by [tsdown](https://tsdown.dev) (Rolldown-based).

## Check

```bash
npx tspub check
```

Runs 60 rules across 5 categories:
- **exports** — validates the `exports` field, condition ordering, file existence
- **types** — checks tsconfig settings and type resolution
- **files** — ensures sensitive files aren't published, bin has shebang
- **metadata** — license, repository, engines, sideEffects
- **size** — package size analysis

Auto-fix most issues:

```bash
npx tspub check --fix
```

## Doctor {#doctor}

Diagnose your project environment and auto-fix issues:

```bash
npx tspub doctor
npx tspub doctor --fix  # Auto-repair issues
```

## Scan {#scan}

Audit any GitHub repository for packaging issues:

```bash
npx tspub scan https://github.com/owner/repo
npx tspub scan --top 10  # Scan top npm packages
```

## Publish

```bash
npx tspub publish patch   # or minor, major
```

This runs: build → check → version bump → changelog → git tag → npm publish.

## Add Scripts to package.json

```json
{
  "scripts": {
    "build": "tspub build",
    "check": "tspub check",
    "prepublishOnly": "tspub build && tspub check"
  }
}
```

## What's Next?

- [Why tspub?](/guide/why-tspub) — The problem tspub solves
- [Checker Rules](/check/rules/) — All 60 rules explained
- [Doctor](/doctor/) — 16 diagnostic rules
- [Scan](/scan/) — Audit any GitHub repo
- [Configuration](/config/) — Customize with `tspub.config.ts`
- [Changeset Workflow](/changeset/) — Version management
- [Type Testing](/type-test/) — Test your declarations
- [CI Integration](/guide/ci-integration) — GitHub Actions setup
