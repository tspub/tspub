# engines

> Check that engines field specifies minimum Node version

| Property | Value |
|----------|-------|
| Rule ID | `metadata/engines` |
| Category | metadata |
| Severity | :yellow_circle: warning |
| Fixable | :warning: Auto-fixable (unsafe) |

## What it Checks

The `"engines"` field tells users the minimum Node.js version. Without it, users on old Node versions get confusing errors.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "metadata/engines"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "metadata/engines": "off",  // or "warning", "error", "info"
    },
  },
};
```
