# esm-dynamic-only

> Detect when package is only available via dynamic import for ESM consumers

| Property | Value |
|----------|-------|
| Rule ID | `types/esm-dynamic-only` |
| Category | types |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Detects when a package can only be consumed via `await import()` in ESM, not via a static `import` statement. This typically happens when a CJS-only package is used from an ESM context, forcing consumers into async-only usage patterns.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "types/esm-dynamic-only"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "types/esm-dynamic-only": "off",  // or "warning", "error", "info"
    },
  },
};
```
