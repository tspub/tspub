# Checker

tspub's checker validates your TypeScript package against **70 rules** across 6 categories. It catches issues that would break consumers of your package.

## Quick Start

```bash
# Check your package
tspub check

# Auto-fix issues
tspub check --fix

# JSON output for CI
tspub check --format json

# Type resolution table (like attw)
tspub check --format table

# List all rules
tspub check --list-rules
```

## Output Format

By default, results are grouped by category:

```
── exports ──
✓ OK exports field is correct and complete

── types ──
✗ ERROR exports["."].types should come BEFORE import/require/default

── files ──
✓ OK no sensitive files found in published package

── metadata ──
⚠ WARNING sideEffects field is not set

── size ──
✓ OK package size: healthy

✓ 3 passed · ✗ 1 error(s) · ⚠ 1 warning(s)
```

## Formats

| Format | Flag | Use Case |
|--------|------|----------|
| text | `--format text` | Terminal output (default) |
| json | `--format json` | CI pipelines, scripts |
| table | `--format table` | Type resolution matrix |

## Profiles

Skip rules that don't apply to your project:

```bash
# All rules, warnings become errors
tspub check --profile strict

# Skip size checks (for libraries)
tspub check --profile library

# Skip exports/types rules (for apps not published to npm)
tspub check --profile app
```

## Ignoring Rules

```bash
# Skip specific rules
tspub check --ignore-rules "size/package-size,metadata/engines"

# Override severity
tspub check --rule "size/package-size=off" --rule "metadata/engines=warning"
```

Or in `tspub.config.ts`:

```typescript
export default {
  check: {
    severityOverrides: {
      "size/package-size": "off",
      "metadata/engines": "warning",
    },
  },
};
```

## Auto-Fix

14 rules support auto-fix (9 safe, 5 unsafe):

```bash
# Safe fixes only
tspub check --fix

# Include unsafe fixes
tspub check --fix --unsafe

# Preview fixes without applying
tspub check --fix-dry-run

# Interactive mode — confirm each fix
tspub check --fix --interactive

# Only fix specific categories
tspub check --fix --fix-type exports,metadata
```

## Categories

| Category | Rules | Description |
|----------|-------|-------------|
| [exports](/check/rules/exports/) | 28 | Package exports field validation |
| [imports](/check/rules/imports/) | 6 | Import map validation |
| [types](/check/rules/types/) | 14 | TypeScript config and type resolution |
| [files](/check/rules/files/) | 10 | File inclusion and format checks |
| [metadata](/check/rules/metadata/) | 11 | Package metadata validation |
| [size](/check/rules/size/) | 1 | Package size analysis |
