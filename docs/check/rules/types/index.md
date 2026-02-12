# types rules

Check TypeScript configuration and verify type resolution works across node10, node16, and bundler modes.

## Rules (14)

| Rule | Description | Severity | Fixable |
|------|-------------|----------|---------|
| [`tsconfig-exists`](./tsconfig-exists) | Check that tsconfig.json exists | :yellow_circle: warning |  |
| [`declaration`](./declaration) | Check that declaration is enabled in tsconfig | :blue_circle: info |  |
| [`strict`](./strict) | Check that strict mode is enabled in tsconfig | :yellow_circle: warning |  |
| [`module`](./module) | Check tsconfig module setting | :yellow_circle: warning |  |
| [`module-resolution`](./module-resolution) | Check tsconfig moduleResolution setting | :yellow_circle: warning |  |
| [`isolated-modules`](./isolated-modules) | Check that isolatedModules is enabled for bundler compat | :blue_circle: info |  |
| [`declaration-completeness`](./declaration-completeness) | Check that all export subpaths have corresponding .d.ts files | :yellow_circle: warning |  |
| [`no-any-export`](./no-any-export) | Check for excessive `any` types in declaration files | :yellow_circle: warning |  |
| [`resolution`](./resolution) | Validate type resolution across module formats (attw-lite) | :red_circle: error |  |
| [`false-cjs-esm`](./false-cjs-esm) | Detect format mismatch between declaration files and JS (FalseCJS/FalseESM) | :red_circle: error |  |
| [`false-export-default`](./false-export-default) | Detect `export default` in types with `module.exports` in JS | :yellow_circle: warning |  |
| [`missing-export-equals`](./missing-export-equals) | Detect CJS modules whose types lack `export =` | :blue_circle: info |  |
| [`esm-dynamic-only`](./esm-dynamic-only) | Detect when package is only available via dynamic import for ESM consumers | :yellow_circle: warning |  |
| [`cjs-resolves-esm`](./cjs-resolves-esm) | Detect when CJS require() would resolve to an ESM file | :red_circle: error |  |
