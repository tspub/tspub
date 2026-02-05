# cjs-esmodule-interop

> Detect CJS files using __esModule interop pattern that may cause inconsistent bundler behavior

| Property | Value |
|----------|-------|
| Rule ID | `exports/cjs-esmodule-interop` |
| Category | exports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

CJS files that set `__esModule = true` can behave differently across bundlers (webpack vs esbuild vs Rollup). This pattern should be avoided.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/cjs-esmodule-interop"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/cjs-esmodule-interop": "off",  // or "warning", "error", "info"
    },
  },
};
```
