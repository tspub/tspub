# missing-export-equals

> Detect CJS modules whose types lack "export ="

| Property | Value |
|----------|-------|
| Rule ID | `types/missing-export-equals` |
| Category | types |
| Severity | :blue_circle: info |
| Fixable | No |

## What it Checks

When a CommonJS module uses `module.exports = ...`, the corresponding `.d.ts` file should use `export =` to accurately describe the module shape. Without it, TypeScript consumers may not get correct type information for `require()` calls.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "types/missing-export-equals"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "types/missing-export-equals": "off",  // or "warning", "error", "info"
    },
  },
};
```
