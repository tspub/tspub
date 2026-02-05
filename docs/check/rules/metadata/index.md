# metadata rules

Validate package metadata — license, repository, engines, sideEffects, and more.

## Rules (8)

| Rule | Description | Severity | Fixable |
|------|-------------|----------|---------|
| [`license`](./license) | Check that license field exists in package.json | :yellow_circle: warning | :warning: |
| [`license-file`](./license-file) | Check that a LICENSE file exists | :yellow_circle: warning |  |
| [`repository`](./repository) | Check that repository field exists | :blue_circle: info |  |
| [`engines`](./engines) | Check that engines field specifies minimum Node version | :yellow_circle: warning | :warning: |
| [`side-effects`](./side-effects) | Check that sideEffects field is set for tree-shaking | :yellow_circle: warning |  |
| [`deprecated-fields`](./deprecated-fields) | Warn about deprecated package.json fields | :yellow_circle: warning |  |
| [`peer-dep-conflict`](./peer-dep-conflict) | Check for packages in both peer and regular dependencies | :yellow_circle: warning |  |
| [`use-exports-browser`](./use-exports-browser) | Suggest using exports browser condition over top-level browser field | :blue_circle: info |  |
