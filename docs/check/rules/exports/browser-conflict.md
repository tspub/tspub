# browser-conflict

> Warn when both top-level browser field and exports exist

| Property | Value |
|----------|-------|
| Rule ID | `exports/browser-conflict` |
| Category | exports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Having both `"browser"` and `"exports"` can cause inconsistent resolution. Use the `"browser"` condition inside `"exports"` instead.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/browser-conflict"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/browser-conflict": "off",  // or "warning", "error", "info"
    },
  },
};
```
