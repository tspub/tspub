# type-module

> Check that type: "module" is set appropriately

| Property | Value |
|----------|-------|
| Rule ID | `exports/type-module` |
| Category | exports |
| Severity | :red_circle: error |
| Fixable | :wrench: Auto-fixable (safe) |

## What it Checks

Ensures your `package.json` has `"type": "module"`. Without this, Node.js treats `.js` files as CommonJS, breaking ESM imports.

## Examples

### :x: Incorrect

```json
{ "name": "my-pkg" }
```

### :white_check_mark: Correct

```json
{ "name": "my-pkg", "type": "module" }
```

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "exports/type-module"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "exports/type-module": "off",  // or "warning", "error", "info"
    },
  },
};
```
