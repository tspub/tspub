# file-not-published

> Check that files referenced in exports/main/bin are included in the published package

| Property | Value |
|----------|-------|
| Rule ID | `exports/file-not-published` |
| Category | exports |
| Severity | :red_circle: error |
| Fixable | No |

## What it Checks

If your `"files"` field excludes a directory that `"exports"` references, consumers get a broken package.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/file-not-published"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/file-not-published": "off",  // or "warning", "error", "info"
    },
  },
};
```
