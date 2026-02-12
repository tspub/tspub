# imports rules

Validate the `imports` field in package.json — condition ordering, pattern matching, and format checks.

## Rules (6)

| Rule | Description | Severity | Fixable |
|------|-------------|----------|---------|
| [`default-last`](./default-last) | Check that "default" is the last key in imports condition maps | :red_circle: error | :wrench: |
| [`module-esm-only`](./module-esm-only) | Check that "module" condition in imports points to ESM content | :yellow_circle: warning |  |
| [`module-before-require`](./module-before-require) | Check that "module" comes before "require" in imports condition maps | :yellow_circle: warning | :wrench: |
| [`fallback-array`](./fallback-array) | Warn against fallback arrays in imports | :yellow_circle: warning |  |
| [`glob-matched-files`](./glob-matched-files) | Validate that wildcard patterns in imports match at least one file | :yellow_circle: warning |  |
| [`no-deprecated-subpath`](./no-deprecated-subpath) | Warn on trailing "/" in imports keys (use /* instead) | :yellow_circle: warning |  |
