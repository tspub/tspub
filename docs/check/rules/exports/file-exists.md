# file-exists

> Check that files referenced in exports exist on disk

| Property | Value |
|----------|-------|
| Rule ID | `exports/file-exists` |
| Category | exports |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Detects exports pointing to files that don't exist yet. Usually means you need to run `tspub build` first.

## Examples

### :x: Incorrect

```json
// exports points to ./dist/index.js but dist/ is empty
```

### :white_check_mark: Correct

```json
// Run tspub build first, then check
```

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/file-exists"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/file-exists": "off",  // or "warning", "error", "info"
    },
  },
};
```
