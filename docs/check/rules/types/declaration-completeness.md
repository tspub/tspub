# declaration-completeness

> Check that all export subpaths have corresponding .d.ts files

| Property | Value |
|----------|-------|
| Rule ID | `types/declaration-completeness` |
| Category | types |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Every export subpath should have a matching `.d.ts` file. Missing declarations mean consumers lose type information for those entry points.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "types/declaration-completeness"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "types/declaration-completeness": "off",  // or "warning", "error", "info"
    },
  },
};
```
