# Adding Changesets

## Interactive Mode

```bash
tspub changeset add
```

This prompts you for:
1. **Bump type** — `patch`, `minor`, or `major`
2. **Summary** — A short description of the change

The changeset is saved as a markdown file in `.changeset/`:

```
.changeset/
├── README.md
└── cool-lions-dance.md
```

## Changeset Format

```markdown
---
"my-package": minor
---

Added support for custom themes
```

In monorepos, multiple packages can be in one changeset:

```markdown
---
"@scope/core": minor
"@scope/cli": patch
---

Added theme API to core, updated CLI to support --theme flag
```

## When to Add a Changeset

Add a changeset when your change:
- Adds new functionality (minor)
- Fixes a bug (patch)
- Introduces breaking changes (major)
- Changes public API types (minor or major)

Don't add a changeset for:
- Documentation-only changes
- Internal refactors that don't affect the public API
- Test-only changes
- CI/build tooling changes
