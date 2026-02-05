# module-esm-only

> Check that "module" condition in exports points to ESM content

| Property | Value |
|----------|-------|
| Rule ID | `exports/module-esm-only` |
| Category | exports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

The `"module"` condition is specifically for ESM. Pointing it to a CJS file defeats its purpose.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/module-esm-only"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/module-esm-only": "off",  // or "warning", "error", "info"
    },
  },
};
```
