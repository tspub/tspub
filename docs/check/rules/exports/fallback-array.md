# fallback-array

> Warn against fallback arrays in exports

| Property | Value |
|----------|-------|
| Rule ID | `exports/fallback-array` |
| Category | exports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Fallback arrays in exports (e.g. `["./dist/index.mjs", "./dist/index.js"]`) are rarely needed and often indicate a configuration mistake.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/fallback-array"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/fallback-array": "off",  // or "warning", "error", "info"
    },
  },
};
```
