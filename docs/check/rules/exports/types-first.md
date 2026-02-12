# types-first

> Check that "types" is the first condition in every condition map

| Property | Value |
|----------|-------|
| Rule ID | `exports/types-first` |
| Category | exports |
| Severity | :red_circle: error |
| Fixable | :wrench: Auto-fixable (safe) |

## What it Checks

TypeScript requires `"types"` to be the first condition in every exports condition map. If it appears after other conditions, TypeScript may fail to resolve your type declarations.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/types-first"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/types-first": "off",  // or "warning", "error", "info"
    },
  },
};
```
