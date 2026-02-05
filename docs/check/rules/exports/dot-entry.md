# dot-entry

> Check that exports has a "." entry

| Property | Value |
|----------|-------|
| Rule ID | `exports/dot-entry` |
| Category | exports |
| Severity | :red_circle: error |
| Fixable | :warning: Auto-fixable (unsafe) |

## What it Checks

The `"."` entry is the main entry point of your package. Without it, `import "your-package"` won't resolve.

## Examples

### :x: Incorrect

```json
{ "exports": { "./utils": "./dist/utils.js" } }
```

### :white_check_mark: Correct

```json
{ "exports": { ".": "./dist/index.js", "./utils": "./dist/utils.js" } }
```

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/dot-entry"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/dot-entry": "off",  // or "warning", "error", "info"
    },
  },
};
```
