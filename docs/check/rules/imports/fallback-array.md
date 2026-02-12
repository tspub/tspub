# imports/fallback-array

> Warn against fallback arrays in imports

| Property | Value |
|----------|-------|
| Rule ID | `imports/fallback-array` |
| Category | imports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Fallback arrays in `"imports"` condition values (e.g. `["./a.js", "./b.js"]`) are rarely needed and can mask misconfiguration. Most packages should use a single path per condition.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "imports/fallback-array"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "imports/fallback-array": "off",  // or "warning", "error", "info"
    },
  },
};
```
