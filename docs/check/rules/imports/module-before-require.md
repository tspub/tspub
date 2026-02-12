# imports/module-before-require

> Check that "module" comes before "require" in imports condition maps

| Property | Value |
|----------|-------|
| Rule ID | `imports/module-before-require` |
| Category | imports |
| Severity | :yellow_circle: warning |
| Fixable | :wrench: Auto-fixable (safe) |

## What it Checks

Bundlers match the first applicable condition. If `"require"` appears before `"module"`, bundlers that support both will use the CJS version instead of the optimized ESM version.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "imports/module-before-require"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "imports/module-before-require": "off",  // or "warning", "error", "info"
    },
  },
};
```
