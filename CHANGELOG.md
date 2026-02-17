# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 1.0.0

### Highlights

tspub v1.0.0 — the unified TypeScript package toolkit. Init, build, check, and publish from one tool. tspub builds itself.

### Fixed
- Close checker rule gaps vs publint and attw: improved CJS/ESM interop detection, false-CJS-as-ESM detection, and export condition analysis
- Fix scoped package support (`@types/node`, `@scope/pkg`) across API and playground
- Fix clean URL routing (`/check/chalk`, `/scan/user/repo`) in playground
- Fix UStar prefix validation in tar parser for `@types/*` packages
- Fix `sourcemap: false` config option being ignored due to Commander flag defaults
- Improve score accuracy, comparison labels, and zero-byte file handling

### Improved
- Reduce published bundle size: 59KB compressed / 198KB unpacked (was 76KB / 346KB)
- Enable minification for all build output
- Size rule now respects `files` field for accurate measurement
- Remove all lint warnings (56 → 0)

## 0.1.0

### Added

#### Checker
- 70 validation rules across 6 categories: exports (28), imports (6), types (14), files (10), metadata (11), size (1)
- Auto-fix for most rules (`--fix` and `--fix --unsafe`)
- Severity overrides via config
- Plugin system for custom rules (local files or npm packages)
- Profiles for rule presets (library, app, strict)
- Browser-safe subset (39 rules) for playground use
- Publint rule coverage (39 rules mapped) and attw rule coverage (6 rules mapped)

#### Builder
- ESM, CJS, and IIFE output formats via esbuild
- TypeScript declaration bundling (`.d.ts`)
- Automatic entry detection from package.json exports
- Named entries and auto-splitting
- Sourcemaps, minification, and watch mode
- CJS `__dirname`/`__filename`/`import.meta.url` shims
- Size budgets with build-time enforcement

#### Publisher
- Full publish pipeline: prereq gates, build, check, version bump, npm publish
- 5 prereq gates: clean git, correct branch, npm reachable, authenticated, check passes
- Automatic rollback on npm publish failure (git tag removal, version revert)
- `--dry-run` and `--provenance` support
- GitHub release creation
- Pre/post publish hooks

#### Changeset
- Changeset-based versioning workflow
- Snapshot releases
- Linked and fixed version groups
- Dependent package bumping in monorepos

#### Doctor
- 16 diagnostic rules for project health
- Checks Node version, tsconfig issues, stale builds, duplicate deps
- Auto-fix support

#### Scanner
- Audit any GitHub repo for packaging issues
- `--top N` mode to scan top TypeScript repos
- Configurable concurrency

#### Scaffold
- `tspub init` with ESM, CJS, and React templates
- Generates package.json, tsconfig, CI config

#### Workspace
- Monorepo support for pnpm, yarn, and npm workspaces
- Topological sort for build/publish ordering
- `--filter` flag for all commands

#### Type Tester
- `.test-d.ts` type declaration testing

#### Docs
- VitePress documentation site
- Interactive playground with browser-based checking and scanning
