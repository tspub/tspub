# cjs-default-export

> Detect CJS-only packages with only a default export and no named exports

| Property | Value |
|----------|-------|
| Rule ID | `exports/cjs-default-export` |
| Category | exports |
| Severity | :blue_circle: info |
| Fixable | No |

## What it Checks

CJS packages that only use `module.exports = value` (no named exports) can have inconsistent ESM interop. Consider adding named exports.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/cjs-default-export"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/cjs-default-export": "off",  // or "warning", "error", "info"
    },
  },
};
```
