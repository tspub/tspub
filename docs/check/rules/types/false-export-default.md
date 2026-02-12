# false-export-default

> Detect export default in types with module.exports in JS (FalseExportDefault)

| Property | Value |
|----------|-------|
| Rule ID | `types/false-export-default` |
| Category | types |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Detects when a `.d.ts` file declares `export default` but the corresponding `.js` file uses `module.exports`. This mismatch (known as FalseExportDefault) causes `import x from 'pkg'` to return `undefined` in strict ESM environments.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "types/false-export-default"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "types/false-export-default": "off",  // or "warning", "error", "info"
    },
  },
};
```
