# repository-format

> Check that repository field has a valid format

| Property | Value |
|----------|-------|
| Rule ID | `metadata/repository-format` |
| Category | metadata |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

The `"repository"` field should use the object form with `"type"` and `"url"` properties, or a valid shorthand like `"github:user/repo"`. Malformed values prevent npm from linking to the source repository on the package page.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "metadata/repository-format"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "metadata/repository-format": "off",  // or "warning", "error", "info"
    },
  },
};
```
