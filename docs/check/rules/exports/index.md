# exports rules

Validate the `exports` field in package.json — condition ordering, file existence, format matching, and more.

## Rules (28)

| Rule | Description | Severity | Fixable |
|------|-------------|----------|---------|
| [`type-module`](./type-module) | Check that type: "module" is set appropriately | :red_circle: error | :wrench: |
| [`exports-field`](./exports-field) | Check that exports field exists in package.json | :red_circle: error | :warning: |
| [`dot-entry`](./dot-entry) | Check that exports has a "." entry | :red_circle: error | :warning: |
| [`types-order`](./types-order) | Check that types condition comes before default in exports | :red_circle: error | :wrench: |
| [`import-condition`](./import-condition) | Check that exports has an import condition | :red_circle: error | :warning: |
| [`file-exists`](./file-exists) | Check that files referenced in exports exist on disk | :yellow_circle: warning |  |
| [`value-invalid`](./value-invalid) | Check that every string value in exports starts with ./ | :red_circle: error |  |
| [`default-last`](./default-last) | Check that "default" is the last key in every condition map | :red_circle: error | :wrench: |
| [`module-before-require`](./module-before-require) | Check that "module" comes before "require" in condition maps | :yellow_circle: warning | :wrench: |
| [`imports-field`](./imports-field) | Validate package.json imports field | :red_circle: error |  |
| [`jsx-extensions`](./jsx-extensions) | Check that exports don't use invalid JSX extensions | :red_circle: error |  |
| [`format-mismatch`](./format-mismatch) | Check that export file contents match the expected module format | :yellow_circle: warning |  |
| [`module-esm-only`](./module-esm-only) | Check that "module" condition in exports points to ESM content | :yellow_circle: warning |  |
| [`fallback-array`](./fallback-array) | Warn against fallback arrays in exports | :yellow_circle: warning |  |
| [`types-format`](./types-format) | Check that types conditions use the correct .d.mts/.d.cts extensions for dual packages | :yellow_circle: warning |  |
| [`condition-types`](./condition-types) | Check that export conditions with JS entries have sibling types | :yellow_circle: warning |  |
| [`no-deprecated-subpath`](./no-deprecated-subpath) | Warn on trailing / in exports keys (use /* instead) | :yellow_circle: warning |  |
| [`imports-key-invalid`](./imports-key-invalid) | Check that all imports field keys start with # | :red_circle: error |  |
| [`browser-conflict`](./browser-conflict) | Warn when both top-level browser field and exports exist | :yellow_circle: warning |  |
| [`browser-value-conflict`](./browser-value-conflict) | Detect when exports values are remapped by the browser field | :yellow_circle: warning |  |
| [`file-not-published`](./file-not-published) | Check that files referenced in exports/main/bin are included in the published package | :red_circle: error |  |
| [`glob-matched-files`](./glob-matched-files) | Validate that wildcard patterns in exports match at least one file | :yellow_circle: warning |  |
| [`cjs-esmodule-interop`](./cjs-esmodule-interop) | Detect CJS files using __esModule interop pattern that may cause inconsistent bundler behavior | :yellow_circle: warning |  |
| [`cjs-default-export`](./cjs-default-export) | Detect CJS-only packages with only a default export and no named exports | :blue_circle: info |  |
| [`types-first`](./types-first) | Check that "types" is the first condition in every condition map | :red_circle: error | :wrench: |
| [`esm-main-no-exports`](./esm-main-no-exports) | Warn when "main" is ESM but "exports" is missing | :yellow_circle: warning |  |
| [`module-no-exports`](./module-no-exports) | Warn when "module" field exists but "exports" is missing | :yellow_circle: warning |  |
| [`types-not-exported`](./types-not-exported) | Check that "types" field is also represented in exports conditions | :yellow_circle: warning |  |
