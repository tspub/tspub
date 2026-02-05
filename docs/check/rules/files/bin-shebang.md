# bin-shebang

> Check that bin files have a shebang line

| Property | Value |
|----------|-------|
| Rule ID | `files/bin-shebang` |
| Category | files |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

CLI executables need `#!/usr/bin/env node` as the first line. Without it, the file won't be executable on Unix systems.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "files/bin-shebang"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "files/bin-shebang": "off",  // or "warning", "error", "info"
    },
  },
};
```
