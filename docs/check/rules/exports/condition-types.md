# condition-types

> Check that export conditions with JS entries have sibling types

| Property | Value |
|----------|-------|
| Rule ID | `exports/condition-types` |
| Category | exports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

When you have `"import": "./dist/index.js"`, there should be a sibling `"types"` entry. Without it, TypeScript may not find declarations.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/condition-types"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/condition-types": "off",  // or "warning", "error", "info"
    },
  },
};
```
