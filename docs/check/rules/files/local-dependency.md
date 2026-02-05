# local-dependency

> Error on file:/link: protocol deps, warn on workspace: protocol

| Property | Value |
|----------|-------|
| Rule ID | `files/local-dependency` |
| Category | files |
| Severity | :red_circle: error |
| Fixable | No |

## What it Checks

Dependencies using `file:` or `link:` protocols won't work when published to npm. Use proper version ranges instead.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "files/local-dependency"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "files/local-dependency": "off",  // or "warning", "error", "info"
    },
  },
};
```
