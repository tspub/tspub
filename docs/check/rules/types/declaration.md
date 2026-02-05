# declaration

> Check that declaration is enabled in tsconfig

| Property | Value |
|----------|-------|
| Rule ID | `types/declaration` |
| Category | types |
| Severity | :blue_circle: info |
| Fixable | No |

## What it Checks

The `declaration` compiler option generates `.d.ts` files. Without it, your package won't have type declarations.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "types/declaration"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "types/declaration": "off",  // or "warning", "error", "info"
    },
  },
};
```
