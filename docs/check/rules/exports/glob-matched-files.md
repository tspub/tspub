# glob-matched-files

> Validate that wildcard patterns in exports match at least one file

| Property | Value |
|----------|-------|
| Rule ID | `exports/glob-matched-files` |
| Category | exports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Detects wildcard export patterns like `"./*"` that don't match any actual files on disk.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/glob-matched-files"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/glob-matched-files": "off",  // or "warning", "error", "info"
    },
  },
};
```
