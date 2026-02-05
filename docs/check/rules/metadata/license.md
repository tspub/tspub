# license

> Check that license field exists in package.json

| Property | Value |
|----------|-------|
| Rule ID | `metadata/license` |
| Category | metadata |
| Severity | :yellow_circle: warning |
| Fixable | :warning: Auto-fixable (unsafe) |

## What it Checks

The `"license"` field tells users how they can use your package. Missing it creates legal ambiguity.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "metadata/license"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "metadata/license": "off",  // or "warning", "error", "info"
    },
  },
};
```
