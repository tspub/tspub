# side-effects

> Check that sideEffects field is set for tree-shaking

| Property | Value |
|----------|-------|
| Rule ID | `metadata/side-effects` |
| Category | metadata |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

The `"sideEffects"` field tells bundlers whether your package has side effects. Setting it to `false` enables better tree-shaking.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "metadata/side-effects"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "metadata/side-effects": "off",  // or "warning", "error", "info"
    },
  },
};
```
