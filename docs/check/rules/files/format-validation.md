# format-validation

> Check that .mjs/.cjs files contain the expected module format

| Property | Value |
|----------|-------|
| Rule ID | `files/format-validation` |
| Category | files |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Files with the `.mjs` extension must contain ESM syntax, and files with `.cjs` must contain CommonJS syntax. A format mismatch causes runtime errors when Node.js tries to parse the file.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "files/format-validation"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "files/format-validation": "off",  // or "warning", "error", "info"
    },
  },
};
```
