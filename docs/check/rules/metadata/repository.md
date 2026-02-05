# repository

> Check that repository field exists

| Property | Value |
|----------|-------|
| Rule ID | `metadata/repository` |
| Category | metadata |
| Severity | :blue_circle: info |
| Fixable | No |

## What it Checks

The `"repository"` field links to your source code. npm uses it for the "Repository" link on the package page.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "metadata/repository"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "metadata/repository": "off",  // or "warning", "error", "info"
    },
  },
};
```
