# no-deprecated-subpath

> Warn on trailing / in exports keys (use /* instead)

| Property | Value |
|----------|-------|
| Rule ID | `exports/no-deprecated-subpath` |
| Category | exports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Node.js deprecated trailing `/` in exports keys. Use `/*` pattern instead: `"./utils/*"` instead of `"./utils/"`.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/no-deprecated-subpath"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/no-deprecated-subpath": "off",  // or "warning", "error", "info"
    },
  },
};
```
