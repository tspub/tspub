# use-exports-browser

> Suggest using exports browser condition over top-level browser field

| Property | Value |
|----------|-------|
| Rule ID | `metadata/use-exports-browser` |
| Category | metadata |
| Severity | :blue_circle: info |
| Fixable | No |

## What it Checks

The top-level `"browser"` field is legacy. Modern packages should use the `"browser"` condition inside `"exports"` instead.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "metadata/use-exports-browser"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "metadata/use-exports-browser": "off",  // or "warning", "error", "info"
    },
  },
};
```
