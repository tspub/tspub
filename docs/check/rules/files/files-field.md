# files-field

> Check that files field exists and is configured correctly

| Property | Value |
|----------|-------|
| Rule ID | `files/files-field` |
| Category | files |
| Severity | :yellow_circle: warning |
| Fixable | :wrench: Auto-fixable (safe) |

## What it Checks

The `"files"` field controls what gets published to npm. Without it, everything in your repo gets published — including source, tests, and configs.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "files/files-field"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "files/files-field": "off",  // or "warning", "error", "info"
    },
  },
};
```
