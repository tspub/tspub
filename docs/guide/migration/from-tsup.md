# Migrating from tsup

tspub uses esbuild under the hood — switching from tsup is straightforward.

## Step 1: Remove tsup

```bash
npm uninstall tsup
npm install -D tspub
```

## Step 2: Replace Config

::: code-group

```typescript [tsup.config.ts (before)]
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
});
```

```typescript [tspub.config.ts (after)]
import type { TspubConfig } from "tspub";

export default {
  build: {
    entry: "src/index.ts",
    formats: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
  },
} satisfies TspubConfig;
```

:::

## Step 3: Update Scripts

```json
{
  "scripts": {
    "build": "tspub build",
    "check": "tspub check",
    "prepublishOnly": "tspub build && tspub check"
  }
}
```

## Step 4: Remove tsup Config

```bash
rm tsup.config.ts
```

## What You Gain

- **70 lint rules** validating your package.json automatically
- **Auto-fix** for common issues (`tspub check --fix`)
- **Type testing** with `.test-d.ts` files
- **Changeset versioning** built-in
- **Publish workflow** with branch protection and provenance
