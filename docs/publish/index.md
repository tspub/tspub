# Publishing

tspub's publish command runs the full pipeline: build, check, version bump, changelog, git tag, and npm publish.

## Quick Start

```bash
# Publish a patch release
tspub publish patch

# Publish a minor release
tspub publish minor

# Publish a major release
tspub publish major
```

## Prerequisite Gates

Before publishing begins, tspub validates **5 prerequisite gates**:

1. **Clean git** — Working directory has no uncommitted changes
2. **Correct branch** — Current branch matches configured `publish.branch`
3. **Registry reachable** — npm registry is accessible
4. **Authenticated** — Valid npm credentials are available
5. **Check passes** — `tspub check` finds no errors

If any gate fails, publishing is aborted before any changes are made.

## What Happens

1. **Build** — `tspub build` runs first
2. **Check** — `tspub check` validates the package
3. **Version** — Bumps `package.json` version
4. **Changelog** — Generates/updates `CHANGELOG.md`
5. **Git** — Commits, tags, and pushes
6. **Publish** — `npm publish` with provenance

If any step fails, the process stops. Nothing gets published.

## Rollback on Failure

If `npm publish` fails after git changes have been made:

- The git tag is deleted locally
- The version commit is reverted
- `package.json` is restored to its previous state
- A clear error message explains what happened

This ensures your repository stays in a consistent state even when npm has issues.

## Configuration

```typescript
// tspub.config.ts
export default {
  publish: {
    registry: "https://registry.npmjs.org",
    access: "public",
    provenance: true,
    branch: "main",  // Only allow publishing from main
    changelogStyle: "conventional",
    ci: {
      enabled: true,
      skipPush: false,
    },
  },
};
```

## Branch Protection

Restrict which branches can publish:

```typescript
export default {
  publish: {
    branch: ["main", "release/*"],
  },
};
```

## Pre-release

```bash
tspub publish premajor --preid beta
# 1.0.0 → 2.0.0-beta.0
```
