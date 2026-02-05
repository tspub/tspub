# tsconfig-exists

> Check that tsconfig.json exists

| Property | Value |
|----------|-------|
| Rule ID | `types/tsconfig-exists` |
| Category | types |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

A `tsconfig.json` is needed for TypeScript compilation settings. Without it, tspub can't verify your type configuration.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "types/tsconfig-exists"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "types/tsconfig-exists": "off",  // or "warning", "error", "info"
    },
  },
};
```
