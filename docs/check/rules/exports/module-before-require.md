# module-before-require

> Check that "module" comes before "require" in condition maps

| Property | Value |
|----------|-------|
| Rule ID | `exports/module-before-require` |
| Category | exports |
| Severity | :yellow_circle: warning |
| Fixable | :wrench: Auto-fixable (safe) |

## What it Checks

Bundlers that support the `"module"` condition should use it in preference to `"require"`. Placing `"module"` before `"require"` ensures bundlers get the ESM version.

## Examples

### :x: Incorrect

```json
{ "exports": { ".": { "require": "./dist/index.cjs", "module": "./dist/index.mjs" } } }
```

### :white_check_mark: Correct

```json
{ "exports": { ".": { "module": "./dist/index.mjs", "require": "./dist/index.cjs" } } }
```

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/module-before-require"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/module-before-require": "off",  // or "warning", "error", "info"
    },
  },
};
```
