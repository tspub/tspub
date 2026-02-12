# imports/no-deprecated-subpath

> Warn on trailing "/" in imports keys (use /* instead)

| Property | Value |
|----------|-------|
| Rule ID | `imports/no-deprecated-subpath` |
| Category | imports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Trailing slashes in `"imports"` keys (e.g. `"#utils/"`) are deprecated in Node.js. Use the wildcard pattern `"#utils/*"` instead to match subpath imports.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "imports/no-deprecated-subpath"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "imports/no-deprecated-subpath": "off",  // or "warning", "error", "info"
    },
  },
};
```
