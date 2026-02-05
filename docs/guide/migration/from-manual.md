# Migrating from Manual Setup

If you're manually configuring `tsc`, `package.json`, and `npm publish`, tspub automates the entire workflow.

## Step 1: Install

```bash
npm install -D tspub
```

## Step 2: Run Doctor

```bash
npx tspub doctor
```

This diagnoses your existing package and shows what needs fixing. Add `--fix` to auto-repair:

```bash
npx tspub doctor --fix
```

## Step 3: Run Check

```bash
npx tspub check
```

This validates your `package.json` against 60 rules. Fix issues automatically:

```bash
npx tspub check --fix
```

## Step 4: Add Build

If you're using raw `tsc`:

```json
{
  "scripts": {
    "build": "tspub build"
  }
}
```

tspub generates ESM + CJS + `.d.ts` in one step, replacing separate `tsc` and bundler commands.

## Step 5: Add Scripts

```json
{
  "scripts": {
    "build": "tspub build",
    "check": "tspub check",
    "test:types": "tspub test-types",
    "prepublishOnly": "tspub build && tspub check"
  }
}
```

## What You Can Remove

- `tsc --build` or `tsc -p tsconfig.build.json` scripts
- Manual `package.json` field ordering
- Custom publish scripts
- Separate type-checking validation
