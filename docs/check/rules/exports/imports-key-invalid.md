# imports-key-invalid

> Check that all imports field keys start with #

| Property | Value |
|----------|-------|
| Rule ID | `exports/imports-key-invalid` |
| Category | exports |
| Severity | :red_circle: error |
| Fixable | No |

## What it Checks

The `"imports"` field uses `#` prefix for keys (e.g. `"#utils"`). Keys without `#` are invalid and will be ignored by Node.js.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/imports-key-invalid"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/imports-key-invalid": "off",  // or "warning", "error", "info"
    },
  },
};
```
