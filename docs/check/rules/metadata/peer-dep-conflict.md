# peer-dep-conflict

> Check for packages in both peer and regular dependencies

| Property | Value |
|----------|-------|
| Rule ID | `metadata/peer-dep-conflict` |
| Category | metadata |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

A package in both `peerDependencies` and `dependencies` causes version conflicts. Choose one.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "metadata/peer-dep-conflict"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "metadata/peer-dep-conflict": "off",  // or "warning", "error", "info"
    },
  },
};
```
