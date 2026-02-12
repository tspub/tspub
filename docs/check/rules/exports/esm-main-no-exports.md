# esm-main-no-exports

> Warn when "main" is ESM but "exports" is missing

| Property | Value |
|----------|-------|
| Rule ID | `exports/esm-main-no-exports` |
| Category | exports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

When `"main"` points to an ESM file but the `"exports"` field is missing, older bundlers and Node.js versions may not resolve the entry correctly. Adding an `"exports"` map ensures consistent resolution.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/esm-main-no-exports"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/esm-main-no-exports": "off",  // or "warning", "error", "info"
    },
  },
};
```
