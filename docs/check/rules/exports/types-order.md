# types-order

> Check that types condition comes before default in exports

| Property | Value |
|----------|-------|
| Rule ID | `exports/types-order` |
| Category | exports |
| Severity | :red_circle: error |
| Fixable | :wrench: Auto-fixable (safe) |

## What it Checks

TypeScript requires `"types"` to appear before `"import"`/`"require"`/`"default"` in condition maps. Node.js processes conditions top-to-bottom and uses the first match — if `types` isn't first, TypeScript won't find your declarations.

## Examples

### :x: Incorrect

```json
{ "exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } } }
```

### :white_check_mark: Correct

```json
{ "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } } }
```

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/types-order"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/types-order": "off",  // or "warning", "error", "info"
    },
  },
};
```
