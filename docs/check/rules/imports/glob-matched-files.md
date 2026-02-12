# imports/glob-matched-files

> Validate that wildcard patterns in imports match at least one file

| Property | Value |
|----------|-------|
| Rule ID | `imports/glob-matched-files` |
| Category | imports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

When `"imports"` keys use wildcard patterns (e.g. `#utils/*`), this rule verifies that the corresponding file patterns resolve to at least one file on disk. Empty matches indicate dead or misconfigured subpath patterns.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "imports/glob-matched-files"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "imports/glob-matched-files": "off",  // or "warning", "error", "info"
    },
  },
};
```
