# Versioning

## Consuming Changesets

```bash
tspub changeset version
```

This:
1. Reads all pending changeset files
2. Determines the highest bump per package
3. Updates `package.json` versions
4. Generates/updates `CHANGELOG.md`
5. Deletes consumed changeset files

## Dry Run

Preview without making changes:

```bash
tspub changeset version --dry-run
```

## Dependent Bumping

In monorepos, when package A bumps, packages that depend on A may also need bumps.

Configure in `tspub.config.ts`:

```typescript
export default {
  changeset: {
    // "major" — only bump dependents for major changes
    // "all" — bump dependents for any change
    // "none" — never auto-bump dependents
    dependentBumping: "major",
  },
};
```

## Changelog Styles

Configure how changelogs are generated:

```typescript
export default {
  publish: {
    // "simple" — bullet list
    // "conventional" — grouped by type (feat, fix, etc.)
    // "auto" — detect from git history
    changelogStyle: "conventional",
  },
};
```
