# jsx-extensions

> Check that exports don't use invalid JSX extensions

| Property | Value |
|----------|-------|
| Rule ID | `exports/jsx-extensions` |
| Category | exports |
| Severity | :red_circle: error |
| Fixable | No |

## What it Checks

`.jsx` and `.tsx` files should not appear directly in exports. They should be compiled to `.js` first.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/jsx-extensions"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/jsx-extensions": "off",  // or "warning", "error", "info"
    },
  },
};
```
