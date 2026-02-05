# types-format

> Check that types conditions use the correct .d.mts/.d.cts extensions for dual packages

| Property | Value |
|----------|-------|
| Rule ID | `exports/types-format` |
| Category | exports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

In dual ESM/CJS packages, TypeScript expects `.d.mts` for ESM types and `.d.cts` for CJS types. Using `.d.ts` for both can cause resolution issues.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/types-format"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/types-format": "off",  // or "warning", "error", "info"
    },
  },
};
```
