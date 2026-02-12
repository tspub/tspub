# browser-value-conflict

> Detect when exports values are remapped by the browser field

| Property | Value |
|----------|-------|
| Rule ID | `exports/browser-value-conflict` |
| Category | exports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Detects when file paths in your `"exports"` map are also remapped by the top-level `"browser"` field. This can cause bundlers and runtimes to disagree on which file to load.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/browser-value-conflict"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/browser-value-conflict": "off",  // or "warning", "error", "info"
    },
  },
};
```
