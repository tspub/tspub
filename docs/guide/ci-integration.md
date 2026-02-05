# CI Integration

## GitHub Actions

Add tspub checks to your CI pipeline:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx tspub build
      - run: npx tspub check --format json > tspub-report.json
      - run: npx tspub test-types
```

## JSON Output for CI

Use `--format json` for machine-readable output:

```bash
tspub check --format json
```

```json
{
  "results": [
    {
      "severity": "error",
      "message": "exports[\".\"].types should come BEFORE import/require/default",
      "ruleId": "exports/types-order",
      "fixable": "safe"
    }
  ],
  "summary": {
    "errors": 1,
    "warnings": 0,
    "passed": 15,
    "total": 60
  }
}
```

## Strict Mode

Fail CI on warnings too:

```bash
tspub check --strict
# or
tspub check --profile strict
```

## Publish from CI

```yaml
- name: Publish
  if: github.ref == 'refs/heads/main'
  run: npx tspub publish --ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

With `--ci` flag, tspub:
- Skips interactive prompts
- Uses `NPM_TOKEN` from environment
- Adds `--provenance` if supported
- Validates branch protection

## Changeset CI Workflow

```yaml
- name: Version
  if: github.ref == 'refs/heads/main'
  run: |
    npx tspub changeset version
    git add .
    git commit -m "chore: version packages"
    npx tspub publish
```
