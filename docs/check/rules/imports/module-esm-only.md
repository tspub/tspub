# imports/module-esm-only

> Check that "module" condition in imports points to ESM content

| Property | Value |
|----------|-------|
| Rule ID | `imports/module-esm-only` |
| Category | imports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

The `"module"` condition is intended for ESM-aware bundlers. When it points to a CommonJS file, bundlers may fail to tree-shake or process the import correctly.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "imports/module-esm-only"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "imports/module-esm-only": "off",  // or "warning", "error", "info"
    },
  },
};
```
