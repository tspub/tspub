# All Rules

tspub includes **60 rules** across 5 categories. Each rule has a severity level, and many support auto-fix.

::: tip
Run `tspub check --list-rules` to see all rules in your terminal.
:::

## Legend

| Badge | Meaning |
|-------|---------|
| :red_circle: error | Fails the check |
| :yellow_circle: warning | Warns but doesn't fail |
| :blue_circle: info | Informational only |
| :wrench: safe | Auto-fixable with `--fix` |
| :warning: unsafe | Auto-fixable with `--fix --unsafe` |

## Exports (23 rules) {#exports}

| Rule | Description | Severity | Fixable |
|------|-------------|----------|---------|
| [`type-module`](./exports/type-module) | Check that `type: "module"` is set | :red_circle: error | :wrench: safe |
| [`exports-field`](./exports/exports-field) | Check that `exports` field exists | :red_circle: error | :warning: unsafe |
| [`dot-entry`](./exports/dot-entry) | Check that `exports["."]` is defined | :red_circle: error | :warning: unsafe |
| [`types-order`](./exports/types-order) | Check that `types` condition comes first | :red_circle: error | :wrench: safe |
| [`import-condition`](./exports/import-condition) | Check for `import` condition | :red_circle: error | :warning: unsafe |
| [`file-exists`](./exports/file-exists) | Check exported files exist on disk | :yellow_circle: warning | |
| [`value-invalid`](./exports/value-invalid) | Check export values start with `./` | :red_circle: error | |
| [`default-last`](./exports/default-last) | Check `default` is last condition key | :red_circle: error | :wrench: safe |
| [`module-before-require`](./exports/module-before-require) | Check `module` precedes `require` | :yellow_circle: warning | :wrench: safe |
| [`imports-field`](./exports/imports-field) | Validate `imports` field | :red_circle: error | |
| [`jsx-extensions`](./exports/jsx-extensions) | Check JSX extensions in exports | :red_circle: error | |
| [`format-mismatch`](./exports/format-mismatch) | Check ESM/CJS format consistency | :yellow_circle: warning | |
| [`module-esm-only`](./exports/module-esm-only) | Check `module` points to ESM | :yellow_circle: warning | |
| [`fallback-array`](./exports/fallback-array) | Warn against fallback arrays | :yellow_circle: warning | |
| [`types-format`](./exports/types-format) | Check `.d.ts`/`.d.cts` format matching | :yellow_circle: warning | |
| [`condition-types`](./exports/condition-types) | Check conditions have sibling types | :yellow_circle: warning | |
| [`no-deprecated-subpath`](./exports/no-deprecated-subpath) | Flag trailing `/` in export keys | :yellow_circle: warning | |
| [`imports-key-invalid`](./exports/imports-key-invalid) | Check imports keys start with `#` | :red_circle: error | |
| [`browser-conflict`](./exports/browser-conflict) | Warn on `browser` + `exports` conflict | :yellow_circle: warning | |
| [`file-not-published`](./exports/file-not-published) | Check exported files are in `files` | :red_circle: error | |
| [`glob-matched-files`](./exports/glob-matched-files) | Validate wildcard patterns match files | :yellow_circle: warning | |
| [`cjs-esmodule-interop`](./exports/cjs-esmodule-interop) | Check CJS `__esModule` interop issues | :yellow_circle: warning | |
| [`cjs-default-export`](./exports/cjs-default-export) | Detect CJS-only default export | :blue_circle: info | |

## Types (9 rules) {#types}

| Rule | Description | Severity | Fixable |
|------|-------------|----------|---------|
| [`tsconfig-exists`](./types/tsconfig-exists) | Check tsconfig.json exists | :yellow_circle: warning | |
| [`declaration`](./types/declaration) | Check declaration generation is enabled | :blue_circle: info | |
| [`strict`](./types/strict) | Check strict mode is enabled | :yellow_circle: warning | |
| [`module`](./types/module) | Check tsconfig module setting | :yellow_circle: warning | |
| [`module-resolution`](./types/module-resolution) | Check moduleResolution setting | :yellow_circle: warning | |
| [`isolated-modules`](./types/isolated-modules) | Check isolatedModules is enabled | :blue_circle: info | |
| [`declaration-completeness`](./types/declaration-completeness) | Check all exports have `.d.ts` files | :yellow_circle: warning | |
| [`no-any-export`](./types/no-any-export) | Flag excessive `any` in declarations | :yellow_circle: warning | |
| [`resolution`](./types/resolution) | Verify types resolve in node10/node16/bundler | :red_circle: error | |

## Files (7 rules) {#files}

| Rule | Description | Severity | Fixable |
|------|-------------|----------|---------|
| [`files-field`](./files/files-field) | Check `files` field exists | :yellow_circle: warning | :wrench: safe |
| [`sensitive`](./files/sensitive) | Check for `.env`, credentials | :red_circle: error | |
| [`bin-shebang`](./files/bin-shebang) | Check bin files have shebang | :yellow_circle: warning | |
| [`all-files-format`](./files/all-files-format) | Check JS file format consistency | :yellow_circle: warning | |
| [`prepublish`](./files/prepublish) | Check prepublishOnly script exists | :yellow_circle: warning | :wrench: safe |
| [`duplicate-dep`](./files/duplicate-dep) | Check for duplicate dependencies | :red_circle: error | |
| [`local-dependency`](./files/local-dependency) | Check for `file:` protocol deps | :red_circle: error | |

## Metadata (8 rules) {#metadata}

| Rule | Description | Severity | Fixable |
|------|-------------|----------|---------|
| [`license`](./metadata/license) | Check license field exists | :yellow_circle: warning | :warning: unsafe |
| [`license-file`](./metadata/license-file) | Check LICENSE file exists | :yellow_circle: warning | |
| [`repository`](./metadata/repository) | Check repository field exists | :blue_circle: info | |
| [`engines`](./metadata/engines) | Check engines.node is specified | :yellow_circle: warning | :warning: unsafe |
| [`side-effects`](./metadata/side-effects) | Check sideEffects field is set | :yellow_circle: warning | |
| [`deprecated-fields`](./metadata/deprecated-fields) | Flag deprecated fields | :yellow_circle: warning | |
| [`peer-dep-conflict`](./metadata/peer-dep-conflict) | Check peer dependency conflicts | :yellow_circle: warning | |
| [`use-exports-browser`](./metadata/use-exports-browser) | Prefer exports over browser field | :blue_circle: info | |

## Size (1 rule) {#size}

| Rule | Description | Severity | Fixable |
|------|-------------|----------|---------|
| [`package-size`](./size/package-size) | Check package size is reasonable | :yellow_circle: warning | |
