# import-condition

> Check that exports has an import condition

| Property | Value |
|----------|-------|
| Rule ID | `exports/import-condition` |
| Category | exports |
| Severity | :red_circle: error |
| Fixable | :warning: Auto-fixable (unsafe) |

## What it Checks

Without an `"import"` condition, ESM consumers can't use your package with `import` statements.

## Examples

### :x: Incorrect

```json
{ "exports": { ".": { "types": "./dist/index.d.ts", "require": "./dist/index.cjs" } } }
```

### :white_check_mark: Correct

```json
{ "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } } }
```

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/import-condition"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/import-condition": "off",  // or "warning", "error", "info"
    },
  },
};
```
