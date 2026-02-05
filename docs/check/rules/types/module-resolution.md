# module-resolution

> Check tsconfig moduleResolution setting

| Property | Value |
|----------|-------|
| Rule ID | `types/module-resolution` |
| Category | types |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Validates the `moduleResolution` setting. Libraries should use `"NodeNext"` or `"Bundler"` for modern resolution.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "types/module-resolution"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "types/module-resolution": "off",  // or "warning", "error", "info"
    },
  },
};
```
