# types rules

Check TypeScript configuration and verify type resolution works across node10, node16, and bundler modes.

## Rules (9)

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
