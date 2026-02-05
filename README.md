<div align="center">

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/terminal.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/terminal.svg">
  <img alt="tspub terminal demo" src="docs/terminal.svg" width="600">
</picture>

<br>
<br>

# tspub

**Stop. Publishing. Broken. Packages.**

<br>

[![npm](https://img.shields.io/npm/v/tspub?style=flat-square&color=cc3534)](https://www.npmjs.com/package/tspub)
[![downloads](https://img.shields.io/npm/dm/tspub?style=flat-square)](https://www.npmjs.com/package/tspub)
[![tests](https://img.shields.io/github/actions/workflow/status/anishgiri/tspub/ci.yml?style=flat-square&label=tests)](https://github.com/anishgiri/tspub/actions)

</div>

<br>

---

<br>

<table>
<tr>
<td width="60%">

### The scene

It's 6 PM on a Friday. You've just shipped v2.0.0 of your library.

You feel good. You grab your coffee. You check Twitter.

<br>

**@frustrated_dev:** *"Just updated to v2.0.0 and now I'm getting `Cannot use import statement outside a module`. Anyone else?"*

**@another_dev:** *"Same. Also my types aren't working anymore."*

**@your_biggest_user:** *"Is this package abandoned? v2 is completely broken."*

<br>

Your stomach drops.

</td>
<td width="40%" align="center">

<br>

```
npm publish
```

↓

```
🔥🔥🔥
```

↓

```
npm publish (patch)
npm publish (patch)
npm publish (patch)
```

<br>

</td>
</tr>
</table>

<br>

---

<br>

### What if you could know before they do?

```bash
npx tspub check
```

```
exports/types-order      "types" should be first in conditions
exports/file-exists      ./dist/index.js doesn't exist
types/false-esm          types say ESM, but it's actually CJS
metadata/license         missing license field

4 problems found (3 auto-fixable)
```

```bash
npx tspub check --fix
```

```
✓ Fixed 3 problems
⚠ 1 requires manual fix (types/false-esm)

Your package is ready.
```

**That's tspub.** One command that catches the 60 ways your package can break.

<br>

---

<br>

<div align="center">

## The full picture

</div>

<br>

<table>
<tr>
<td align="center" width="33%">

**60 rules**

Covers publint.
Covers attw.
Plus our own checks.

</td>
<td align="center" width="33%">

**Auto-fix**

Most problems are one
config tweak away.
We just do it for you.

</td>
<td align="center" width="33%">

**One tool**

Build. Check. Publish.
No more 5-tool dance.
No more glue scripts.

</td>
</tr>
</table>

<br>

<div align="center">

| You currently use | Just use |
|:--|:--|
| tsup + publint + arethetypeswrong + np + changesets | `tspub` |

</div>

<br>

---

<br>

## The commands

<br>

<details open>
<summary><b>tspub check</b> — Find what's broken</summary>

<br>

```bash
tspub check                    # find problems
tspub check --fix              # fix the safe ones
tspub check --fix --unsafe     # fix everything
tspub check --list-rules       # see all 60 rules
```

**What it catches:**

| | |
|:--|:--|
| **exports** (27 rules) | Types not first, missing files, ESM/CJS issues, condition ordering |
| **types** (13 rules) | False ESM/CJS, resolution failures across node10/16/bundler |
| **files** (10 rules) | .env leaked, wrong shebang, format inconsistencies |
| **metadata** (9 rules) | Missing license, bad engines, deprecated fields |
| **size** (1 rule) | Package too big |

<br>

</details>

<details>
<summary><b>tspub build</b> — Bundle it properly</summary>

<br>

```bash
tspub build                    # ESM + types
tspub build --format esm,cjs   # dual
tspub build --dts-bundle       # single .d.ts file
tspub build --minify           # production
tspub build --watch            # dev mode
```

- Powered by esbuild
- Infers entries from your package.json
- CJS interop that actually works (no `.default` nonsense)
- Size budgets — build fails if too big

<br>

</details>

<details>
<summary><b>tspub publish</b> — Ship with a safety net</summary>

<br>

```bash
tspub publish patch            # bump + ship
tspub publish minor --dry-run  # preview first
tspub publish --prerelease beta
tspub publish --provenance     # npm attestation
```

**What happens:**

```
┌─────────┐   ┌───────┐   ┌───────┐   ┌──────┐   ┌─────────┐
│ 5 Gates │ → │ Build │ → │ Check │ → │ Bump │ → │ Publish │
└─────────┘   └───────┘   └───────┘   └──────┘   └─────────┘
     │                                                 │
     ↓                                                 ↓
  STOP if                                        ROLLBACK if
  not ready                                      npm fails
```

The 5 gates: clean git, right branch, npm reachable, logged in, check passes.

If npm publish fails → git tag deleted, version reverted. No half-broken releases.

<br>

</details>

<details>
<summary><b>tspub doctor</b> — Debug the weird stuff</summary>

<br>

```bash
tspub doctor                   # full scan
tspub doctor --fix             # fix what's fixable
```

```
environment/node-version    ✓ v20.10.0 (matches engines)
environment/lockfiles       ✗ found package-lock.json AND yarn.lock
typescript/strict           ✗ strict mode not enabled
typescript/declaration      ✗ declaration not enabled
build/output-fresh          ✗ dist/ older than src/
dependencies/duplicates     ✗ react in deps AND devDeps
```

<br>

</details>

<details>
<summary><b>tspub scan</b> — Audit any repo</summary>

<br>

```bash
tspub scan https://github.com/someone/thing
tspub scan --top 20            # top 20 TS repos on GitHub
tspub scan --top 50 --concurrency 5
```

Great for auditing your dependencies before you `npm install` them.

<br>

</details>

<details>
<summary><b>tspub init</b> — Start fresh</summary>

<br>

```bash
tspub init my-package
tspub init my-package --cjs    # include CommonJS
tspub init my-package --react  # React + JSX
```

<br>

</details>

<br>

---

<br>

## Install

```bash
npm i -D tspub
```

Or just `npx tspub check` — no install needed.

<br>

---

<br>

## Config

Zero config works. But if you want control:

```ts
// tspub.config.ts
export default {
  build: {
    formats: ["esm", "cjs"],
    entry: "src/index.ts",
    sizeLimits: { "dist/index.js": "50kb" },
  },
  check: {
    severityOverrides: {
      "exports/types-order": "off",  // don't care about this one
    },
  },
  publish: {
    access: "public",
    branch: ["main"],
  },
};
```

<br>

---

<br>

## Plugins

Make your own rules:

```js
export const rules = [{
  meta: { id: "custom/no-barrel-files", fixable: false },
  check(ctx) {
    // your logic here
  },
}];
```

```ts
// tspub.config.ts
export default {
  check: { plugins: ["./my-rules.js"] },
};
```

<br>

---

<br>

## Monorepos

It just works.

```bash
tspub build --filter "@myorg/*"
tspub check --filter "packages/core"
tspub publish --filter "!docs"   # everything except docs
```

pnpm, yarn, npm workspaces — all supported.

<br>

---

<br>

## API

```ts
import { check, build, doctor, scan } from "tspub";

await check({ dir: ".", fix: true });
await build({ formats: ["esm", "cjs"] });
await doctor({ dir: "." });
await scan({ url: "https://github.com/user/repo" });
```

<br>

---

<br>

## FAQ

<details>
<summary><b>How is this different from publint?</b></summary>

publint has 47 rules focused on exports and file formats. tspub has 60 rules covering exports, types, files, metadata, and size. We check everything publint checks, plus type resolution (like attw), plus tsconfig validation, size budgets, and more. And we can auto-fix.

</details>

<details>
<summary><b>How is this different from arethetypeswrong?</b></summary>

attw only checks types. We check types + exports + files + metadata + size. And we can auto-fix.

</details>

<details>
<summary><b>Does this replace tsup/unbuild?</b></summary>

Yes. `tspub build` handles ESM, CJS, IIFE, DTS bundling, sourcemaps, minification, and watch mode.

</details>

<details>
<summary><b>Does this work with monorepos?</b></summary>

Yes. All commands accept `--filter` and process packages in topological order.

</details>

<br>

---

<br>

## Requirements

Node 18+ · TypeScript 5+ recommended

<br>

---

<br>

<div align="center">

Made for the mass-publishers. The Friday deployers. The "it worked on my machine" crowd.

We've all been there. Now we don't have to go back.

<br>

[GitHub](https://github.com/anishgiri/tspub) · [Issues](https://github.com/anishgiri/tspub/issues) · [npm](https://npmjs.com/package/tspub)

<br>

<sub>If this saved your Friday, consider a ⭐</sub>

</div>

<br>
