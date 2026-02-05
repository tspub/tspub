# default-last

> Check that "default" is the last key in every condition map

| Property | Value |
|----------|-------|
| Rule ID | `exports/default-last` |
| Category | exports |
| Severity | :red_circle: error |
| Fixable | :wrench: Auto-fixable (safe) |

## What it Checks

Node.js processes export conditions top-to-bottom. `"default"` is a catch-all — if it appears before specific conditions like `"import"` or `"require"`, those conditions are unreachable.

## Examples

### :x: Incorrect

```json
{ "exports": { ".": { "default": "./dist/index.js", "import": "./dist/index.mjs" } } }
```

### :white_check_mark: Correct

```json
{ "exports": { ".": { "import": "./dist/index.mjs", "default": "./dist/index.js" } } }
```

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/default-last"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/default-last": "off",  // or "warning", "error", "info"
    },
  },
};
```
