# Changesets

tspub includes a built-in changeset system for version management, compatible with the `@changesets/cli` workflow.

## What is a Changeset?

A changeset is a markdown file in `.changeset/` that describes a version bump and its reason. On release, changesets are consumed to determine version bumps and generate changelogs.

## Workflow

```bash
# 1. Create a changeset (after making changes)
tspub changeset add

# 2. Check what's pending
tspub changeset status

# 3. Consume changesets → bump versions + update changelogs
tspub changeset version

# 4. Publish
tspub publish
```

## Monorepo Support

In monorepos, `tspub changeset add` prompts you to:
1. Select affected packages
2. Choose bump type per package
3. Write a summary

## Snapshot Releases

Publish pre-release versions for testing:

```bash
tspub changeset snapshot --tag canary
```

This creates versions like `1.0.1-canary.20240101120000`.

## Configuration

```typescript
// tspub.config.ts
export default {
  changeset: {
    // How dependent packages get bumped: "major" | "all" | "none"
    dependentBumping: "major",

    // Tag for snapshot releases
    snapshotTag: "canary",
  },
};
```
