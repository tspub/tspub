# cjs-resolves-esm

Detect when CJS `require()` would resolve to an ESM file, causing `ERR_REQUIRE_ESM` at runtime.

| | |
|---|---|
| **Rule ID** | `types/cjs-resolves-esm` |
| **Category** | types |
| **Default Severity** | :red_circle: error |
| **Fixable** | No |
| **attw equivalent** | `CJSResolvesToESM` |

## What it checks

This rule detects packages where a CommonJS `require()` call would resolve to an ESM file. Node.js throws `ERR_REQUIRE_ESM` when this happens, breaking CJS consumers.

Common patterns caught:

1. **`type: "module"` with string exports** — `require()` resolves to a `.js` file that is ESM
2. **`require` condition pointing to `.mjs`** — `.mjs` is always ESM
3. **`require` condition pointing to `.js` with `type: "module"`** — `.js` is ESM when `type: "module"`
4. **`default` fallback to ESM** — no `require` condition, CJS falls back to `default` which is ESM

## Examples

### Fail

```json
{
  "type": "module",
  "exports": "./source/index.js"
}
```

```json
{
  "exports": {
    ".": {
      "require": "./dist/index.mjs"
    }
  }
}
```

```json
{
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

### Pass

```json
{
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

## How to fix

Provide a CJS-compatible file for the `require` condition:

- Use `.cjs` extension for CJS files when `type: "module"`
- Add a separate `require` condition pointing to a CJS build
- Use a bundler (like `tspub build --format esm,cjs`) to generate both formats
