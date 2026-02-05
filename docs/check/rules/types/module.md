# module

> Check tsconfig module setting

| Property | Value |
|----------|-------|
| Rule ID | `types/module` |
| Category | types |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Validates that the `module` compiler option is appropriate for your package format (ESM packages should use `"NodeNext"` or `"ESNext"`).

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "types/module"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "types/module": "off",  // or "warning", "error", "info"
    },
  },
};
```
