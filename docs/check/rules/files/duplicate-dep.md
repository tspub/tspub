# duplicate-dep

> Check for packages in both dependencies and devDependencies

| Property | Value |
|----------|-------|
| Rule ID | `files/duplicate-dep` |
| Category | files |
| Severity | :red_circle: error |
| Fixable | No |

## What it Checks

A package should not be in both `dependencies` and `devDependencies`. This causes confusion about whether it ships with your package.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "files/duplicate-dep"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "files/duplicate-dep": "off",  // or "warning", "error", "info"
    },
  },
};
```
