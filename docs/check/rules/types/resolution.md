# resolution

> Validate type resolution across module formats (attw-lite)

| Property | Value |
|----------|-------|
| Rule ID | `types/resolution` |
| Category | types |
| Severity | :red_circle: error |
| Fixable | No |

## What it Checks

Verifies that TypeScript can resolve your types under `node10`, `node16`, and `bundler` module resolution modes. This is the same check that `@arethetypeswrong/cli` performs.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "types/resolution"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "types/resolution": "off",  // or "warning", "error", "info"
    },
  },
};
```
