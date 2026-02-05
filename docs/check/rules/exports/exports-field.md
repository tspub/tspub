# exports-field

> Check that exports field exists in package.json

| Property | Value |
|----------|-------|
| Rule ID | `exports/exports-field` |
| Category | exports |
| Severity | :red_circle: error |
| Fixable | :warning: Auto-fixable (unsafe) |

## What it Checks

The `exports` field is the modern way to define package entry points. Without it, consumers rely on legacy `main`/`module` fields which have ambiguous resolution behavior.

## Examples

### :x: Incorrect

```json
{ "name": "my-pkg", "main": "./dist/index.js" }
```

### :white_check_mark: Correct

```json
{ "name": "my-pkg", "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } } }
```

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/exports-field"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/exports-field": "off",  // or "warning", "error", "info"
    },
  },
};
```
