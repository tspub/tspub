# all-files-format

> Check that all JS files match their expected module format (when no exports field)

| Property | Value |
|----------|-------|
| Rule ID | `files/all-files-format` |
| Category | files |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

When no `exports` field is present, checks that all `.js` files match the format indicated by `"type"` in package.json.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "files/all-files-format"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "files/all-files-format": "off",  // or "warning", "error", "info"
    },
  },
};
```
