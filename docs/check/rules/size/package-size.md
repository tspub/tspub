# package-size

> Check that package dist size is reasonable

| Property | Value |
|----------|-------|
| Rule ID | `size/package-size` |
| Category | size |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Flags packages that are unusually large. Large packages slow down `npm install` and bloat `node_modules`.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "size/package-size"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "size/package-size": "off",  // or "warning", "error", "info"
    },
  },
};
```
