# imports-field

> Validate package.json imports field

| Property | Value |
|----------|-------|
| Rule ID | `exports/imports-field` |
| Category | exports |
| Severity | :red_circle: error |
| Fixable | No |

## What it Checks

Validates the `"imports"` field (package internal imports). Catches malformed entries and invalid patterns.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/imports-field"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/imports-field": "off",  // or "warning", "error", "info"
    },
  },
};
```
