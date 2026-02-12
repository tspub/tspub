<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/terminal.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/terminal.svg">
  <img alt="tspub terminal demo" src="docs/terminal.svg" width="600">
</picture>

# tspub

Replaces tsup + publint + attw + changesets. One dependency, 70 lint rules, zero config.

[![npm](https://img.shields.io/npm/v/@tspub-dev/tspub?style=flat-square&color=cc3534)](https://www.npmjs.com/package/@tspub-dev/tspub)
[![downloads](https://img.shields.io/npm/dm/@tspub-dev/tspub?style=flat-square)](https://www.npmjs.com/package/@tspub-dev/tspub)
[![tests](https://img.shields.io/github/actions/workflow/status/tspub/tspub/ci.yml?style=flat-square&label=tests)](https://github.com/tspub/tspub/actions)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

[Docs](https://tspub.dev) · [Playground](https://tspub.dev/playground) · [npm](https://npmjs.com/package/@tspub-dev/tspub)

</div>

## Why

Publishing a TypeScript package correctly means juggling tsup, publint, attw, changesets, and a bunch of config files. tspub replaces all of them.

| Before | After |
|:--|:--|
| tsup + publint + arethetypeswrong + changesets + np | `tspub` |

## Install

```bash
npm i -D @tspub-dev/tspub
# or: pnpm add -D @tspub-dev/tspub
# or: yarn add -D @tspub-dev/tspub
```

Or run directly: `npx tspub check`

## What it does

**70 rules** that catch broken exports, bad types, missing files, and metadata issues — before your users do.

```bash
$ npx tspub check

exports/types-order      "types" should be first in conditions
exports/file-exists      ./dist/index.js doesn't exist
types/false-cjs-esm      types say ESM, but it's actually CJS
metadata/license         missing license field

4 problems found (3 auto-fixable)
```

```bash
$ npx tspub check --fix

Fixed 3 problems. 1 requires manual fix (types/false-esm).
```

## Commands

```bash
tspub check                    # lint your package (70 rules)
tspub check --fix              # auto-fix what's safe
tspub build                    # bundle with esbuild (ESM + types)
tspub build --format esm,cjs   # dual format
tspub publish patch            # bump, build, check, publish
tspub doctor                   # diagnose tsconfig/env issues
tspub doctor --fix             # auto-repair
tspub scan user/repo           # audit any GitHub repo
tspub init my-package          # scaffold a new package
tspub changeset add            # add a changeset for versioning
```

## Rules

| Category | Count | Examples |
|:--|:--|:--|
| exports | 28 | types-first, file-exists, format-mismatch, ESM/CJS conditions |
| types | 14 | false-cjs-esm, resolution failures, missing declarations |
| metadata | 11 | license, engines, deprecated fields, repository format |
| files | 10 | sensitive files leaked, wrong shebang, format validation |
| imports | 6 | import map validation, resolution checks |
| size | 1 | package size budget |

Covers everything publint and attw check, plus more.

## Config

Zero config by default. Customize if needed:

```ts
// tspub.config.ts
export default {
  build: {
    formats: ["esm", "cjs"],
    entry: "src/index.ts",
  },
  check: {
    severityOverrides: {
      "exports/types-order": "off",
    },
  },
};
```

## Monorepos

Works with pnpm, yarn, and npm workspaces.

```bash
tspub build --filter "@myorg/*"
tspub check --filter "packages/core"
```

## API

```ts
import { check, build, doctor, scan } from "@tspub-dev/tspub";

const results = await check({ dir: ".", fix: true });
await build({ formats: ["esm", "cjs"] });
```

## Requirements

Node 20+, TypeScript 5+ recommended.

## License

MIT
