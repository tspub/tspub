# strict

> Check that strict mode is enabled in tsconfig

| Property | Value |
|----------|-------|
| Rule ID | `types/strict` |
| Category | types |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

TypeScript strict mode catches more errors at compile time. Libraries should use strict mode to ensure type safety for consumers.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "types/strict"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "types/strict": "off",  // or "warning", "error", "info"
    },
  },
};
```
