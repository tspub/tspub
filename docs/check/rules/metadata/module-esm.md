# module-esm

> Check that top-level "module" field points to ESM content

| Property | Value |
|----------|-------|
| Rule ID | `metadata/module-esm` |
| Category | metadata |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

The `"module"` field is a convention for bundlers to find the ESM entry point. When it points to a CommonJS file, bundlers cannot tree-shake the package effectively.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "metadata/module-esm"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "metadata/module-esm": "off",  // or "warning", "error", "info"
    },
  },
};
```
