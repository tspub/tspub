# prepublish

> Check that prepublishOnly script exists

| Property | Value |
|----------|-------|
| Rule ID | `files/prepublish` |
| Category | files |
| Severity | :yellow_circle: warning |
| Fixable | :wrench: Auto-fixable (safe) |

## What it Checks

A `prepublishOnly` script ensures your package is built and checked before publishing. Without it, you might publish stale or broken code.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "files/prepublish"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "files/prepublish": "off",  // or "warning", "error", "info"
    },
  },
};
```
