# imports/default-last

> Check that "default" is the last key in imports condition maps

| Property | Value |
|----------|-------|
| Rule ID | `imports/default-last` |
| Category | imports |
| Severity | :red_circle: error |
| Fixable | :wrench: Auto-fixable (safe) |

## What it Checks

Node.js processes import conditions top-to-bottom. `"default"` is a catch-all -- if it appears before specific conditions like `"import"` or `"require"`, those conditions are unreachable.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "imports/default-last"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "imports/default-last": "off",  // or "warning", "error", "info"
    },
  },
};
```
