# Migrating from @changesets/cli

tspub's changeset system mirrors the `@changesets/cli` workflow. Switching is seamless.

## Step 1: Replace Dependency

```bash
npm uninstall @changesets/cli
npm install -D @tspub-dev/tspub
```

## Step 2: Keep Your .changeset Directory

tspub reads the same `.changeset/` directory format. Existing changesets continue to work.

## Step 3: Update Commands

| @changesets/cli | tspub |
|-----------------|-------|
| `changeset` | `tspub changeset` or `tspub changeset add` |
| `changeset status` | `tspub changeset status` |
| `changeset version` | `tspub changeset version` |
| `changeset publish` | `tspub publish` |

## Step 4: Update CI

```yaml
# Before
- run: npx changeset version
- run: npx changeset publish

# After
- run: npx tspub changeset version
- run: npx tspub publish
```

## New Features

- **Snapshot releases**: `tspub changeset snapshot --tag canary`
- **Dependent bumping**: Configure how dependent packages get bumped
- **Dry run**: `tspub changeset version --dry-run`
- **Integrated publish**: `tspub publish` does build + check + version + publish in one step
