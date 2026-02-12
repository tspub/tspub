# field-value-type

> Check that common package.json fields have correct value types

| Property | Value |
|----------|-------|
| Rule ID | `metadata/field-value-type` |
| Category | metadata |
| Severity | :red_circle: error |
| Fixable | No |

## What it Checks

Validates that common `package.json` fields have the correct JSON types. For example, `"name"` must be a string, `"keywords"` must be an array, and `"bin"` must be a string or object. Incorrect types cause failures in npm, bundlers, and other tools.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "metadata/field-value-type"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "metadata/field-value-type": "off",  // or "warning", "error", "info"
    },
  },
};
```
