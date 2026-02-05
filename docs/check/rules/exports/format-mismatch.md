# format-mismatch

> Check that export file contents match the expected module format

| Property | Value |
|----------|-------|
| Rule ID | `exports/format-mismatch` |
| Category | exports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Detects when a file claimed as ESM (via `"import"` condition) actually contains CommonJS syntax (`module.exports`), or vice versa.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/format-mismatch"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/format-mismatch": "off",  // or "warning", "error", "info"
    },
  },
};
```
