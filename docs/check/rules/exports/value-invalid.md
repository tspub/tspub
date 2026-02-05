# value-invalid

> Check that every string value in exports starts with ./

| Property | Value |
|----------|-------|
| Rule ID | `exports/value-invalid` |
| Category | exports |
| Severity | :red_circle: error |
| Fixable | No |

## What it Checks

All export values must be relative paths starting with `./`. Bare specifiers or absolute paths are invalid.

## Examples

### :x: Incorrect

```json
{ "exports": { ".": { "import": "dist/index.js" } } }
```

### :white_check_mark: Correct

```json
{ "exports": { ".": { "import": "./dist/index.js" } } }
```

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/value-invalid"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/value-invalid": "off",  // or "warning", "error", "info"
    },
  },
};
```
