# deprecated-fields

> Warn about deprecated package.json fields

| Property | Value |
|----------|-------|
| Rule ID | `metadata/deprecated-fields` |
| Category | metadata |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Flags deprecated fields like `"preferGlobal"`, `"engineStrict"`, and other legacy package.json entries.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "metadata/deprecated-fields"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "metadata/deprecated-fields": "off",  // or "warning", "error", "info"
    },
  },
};
```
