# module-no-exports

> Warn when "module" field exists but "exports" is missing

| Property | Value |
|----------|-------|
| Rule ID | `exports/module-no-exports` |
| Category | exports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

The `"module"` field is a non-standard convention used by bundlers. When it exists without an `"exports"` field, Node.js cannot resolve the ESM entry. Adding an `"exports"` map ensures all tools can find your package entry.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/module-no-exports"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/module-no-exports": "off",  // or "warning", "error", "info"
    },
  },
};
```
