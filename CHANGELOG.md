# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 0.1.0

### Added

#### Checker
- 70 validation rules across 6 categories: exports (28), imports (6), types (14), files (10), metadata (11), size (1)
- Auto-fix for most rules (`--fix` and `--fix --unsafe`)
- Severity overrides via config
- Plugin system for custom rules (local files or npm packages)
- Profiles for rule presets (library, app, strict)
- Browser-safe subset (39 rules) for playground use
- Publint rule coverage (39 rules mapped) and attw rule coverage (5 rules mapped)

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
