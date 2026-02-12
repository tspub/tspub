# types-not-exported

> Check that "types" field is also represented in exports conditions

| Property | Value |
|----------|-------|
| Rule ID | `exports/types-not-exported` |
| Category | exports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

When the top-level `"types"` field points to a declaration file but the `"exports"` map does not include a `"types"` condition, TypeScript may fail to resolve types for consumers using `"moduleResolution": "bundler"` or `"node16"`.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/types-not-exported"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/types-not-exported": "off",  // or "warning", "error", "info"
    },
  },
};
```
