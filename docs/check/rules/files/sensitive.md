# sensitive

> Check for sensitive files in published package and dist

| Property | Value |
|----------|-------|
| Rule ID | `files/sensitive` |
| Category | files |
| Severity | :red_circle: error |
| Fixable | No |

## What it Checks

Detects `.env`, credentials, private keys, and other sensitive files that would be published to npm.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "files/sensitive"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "files/sensitive": "off",  // or "warning", "error", "info"
    },
  },
};
```
