# license-file

> Check that a LICENSE file exists

| Property | Value |
|----------|-------|
| Rule ID | `metadata/license-file` |
| Category | metadata |
| Severity | :yellow_circle: warning |
| Fixable | No |

## What it Checks

A LICENSE file provides the full license text. While the `license` field in package.json gives the SPDX identifier, the full text is often legally required.

## Configuration

Disable this rule:

```bash
tspub check --ignore-rules "metadata/license-file"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "metadata/license-file": "off",  // or "warning", "error", "info"
    },
  },
};
```
