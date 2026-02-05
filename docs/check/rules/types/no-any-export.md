# no-any-export

> Check for excessive `any` types in declaration files

| Property | Value |
|----------|-------|
| Rule ID | `types/no-any-export` |
| Category | types |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Declaration files with excessive `any` types provide poor type safety for consumers. This rule flags packages where more than 50% of exports use `any`.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "types/no-any-export"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "types/no-any-export": "off",  // or "warning", "error", "info"
    },
  },
};
```
