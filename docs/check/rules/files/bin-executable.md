# bin-executable

> Check that bin files have executable permissions

| Property | Value |
|----------|-------|
| Rule ID | `files/bin-executable` |
| Category | files |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

Files referenced in the `"bin"` field must have executable permissions (`chmod +x`). Without the execute bit, the CLI command will fail on Unix systems after installation.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "files/bin-executable"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "files/bin-executable": "off",  // or "warning", "error", "info"
    },
  },
};
```
