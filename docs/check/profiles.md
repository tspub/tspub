# Check Profiles

Profiles are presets that disable rules irrelevant to your project type.

## `strict`

All rules enabled. Warnings become errors.

```bash
tspub check --profile strict
```

Best for: Libraries published to npm that need maximum quality.

## `library`

Disables size checks. Everything else enabled.

```bash
tspub check --profile library
```

Disabled rules:
- `size/package-size`

Best for: Libraries where package size isn't critical (internal tools, rarely-installed packages).

## `app`

Disables exports and type resolution rules. Keeps files, metadata, and size checks.

```bash
tspub check --profile app
```

Disabled rules:
- All `exports/*` rules (23 rules)
- `types/declaration`, `types/declaration-completeness`, `types/no-any-export`, `types/resolution`

Best for: Applications not published to npm (Next.js apps, API servers).

## Combining with Overrides

Profiles can be combined with `--rule` and `--ignore-rules`:

```bash
# Use library profile but also disable license check
tspub check --profile library --ignore-rules "metadata/license"
```

Config-file overrides take precedence over profile defaults.
