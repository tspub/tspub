# false-cjs-esm

> Detect format mismatch between declaration files and JS files (FalseCJS/FalseESM)

| Property | Value |
|----------|-------|
| Rule ID | `types/false-cjs-esm` |
| Category | types |
| Severity | :red_circle: error |
| Fixable | No |

## What it Checks

Detects when a `.d.ts` file uses ESM syntax (`export {}`) but the corresponding `.js` file is CommonJS, or vice versa. This mismatch (known as FalseCJS or FalseESM) causes runtime errors for consumers.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "types/false-cjs-esm"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "types/false-cjs-esm": "off",  // or "warning", "error", "info"
    },
  },
};
```
