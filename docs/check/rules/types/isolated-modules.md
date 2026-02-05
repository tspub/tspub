# isolated-modules

> Check that isolatedModules is enabled for bundler compat

| Property | Value |
|----------|-------|
| Rule ID | `types/isolated-modules` |
| Category | types |
| Severity | :blue_circle: info |
| Fixable | No |

## What it Checks

Bundlers process files individually, not as a project. `isolatedModules: true` ensures your code works with bundlers.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "types/isolated-modules"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "types/isolated-modules": "off",  // or "warning", "error", "info"
    },
  },
};
```
