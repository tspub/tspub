# implicit-index-format

> Check that implicit index.js matches the declared package type

| Property | Value |
|----------|-------|
| Rule ID | `files/implicit-index-format` |
| Category | files |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

When a package uses `"main": "./dist/index.js"` without an explicit extension like `.mjs` or `.cjs`, the file format is determined by the `"type"` field. This rule checks that the actual content of the file matches the expected format based on the package type.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "files/implicit-index-format"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "files/implicit-index-format": "off",  // or "warning", "error", "info"
    },
  },
};
```
