# Plugins

Write custom checker rules and share them as npm packages.

## Writing a Plugin

A plugin exports an array of rules:

```typescript
// my-plugin.ts
import type { Rule, RawDiagnostic } from "tspub";

const noInternalExports: Rule = {
  meta: {
    id: "custom/no-internal-exports",
    description: "Disallow exporting internal modules",
    defaultSeverity: "error",
    fixable: false,
    category: "custom",
  },
  check(ctx) {
    const results: RawDiagnostic[] = [];
    if (ctx.pkg.exports && typeof ctx.pkg.exports === "object") {
      for (const key of Object.keys(ctx.pkg.exports)) {
        if (key.includes("internal")) {
          results.push({
            severity: "error",
            message: `Subpath "${key}" exposes internal module`,
          });
        }
      }
    }
    return results;
  },
};

export const rules = [noInternalExports];
```

## Plugin Structure

A plugin must export one of:

```typescript
// Named export
export const rules: Rule[] = [/* ... */];

// Default export
export default { rules: [/* ... */] };
```

## Rule Interface

```typescript
interface Rule {
  meta: {
    id: string;          // "category/name" format
    description: string;
    defaultSeverity: "error" | "warning" | "info";
    fixable: false | "safe" | "unsafe";
    category: string;    // Must match id prefix
  };
  check(ctx: CheckContext): RawDiagnostic[] | Promise<RawDiagnostic[]>;
  fix?(ctx: FixContext): FixResult | Promise<FixResult>;
}
```

## CheckContext

Available in the `check` function:

```typescript
interface CheckContext {
  pkg: PackageJson;                          // Parsed package.json
  dir: string;                               // Package directory
  compilerOptions: Record<string, unknown>;   // tsconfig compilerOptions
  hasBuildOutput: boolean;                    // Whether dist/ exists
  distFiles: string[];                       // Files in dist/
  allJsFiles: string[];                      // All .js files
}
```

## Loading Plugins

In `tspub.config.ts`:

```typescript
export default {
  check: {
    plugins: [
      // npm package
      "tspub-plugin-my-rules",

      // Local file (relative to project root)
      "./tools/custom-rules.js",

      // Absolute path
      "/path/to/plugin.js",
    ],
  },
};
```

## Publishing a Plugin

Convention: name your package `tspub-plugin-*`.

```json
{
  "name": "tspub-plugin-my-rules",
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  }
}
```

## Fixable Rules

Plugins can provide auto-fix:

```typescript
const myRule: Rule = {
  meta: { /* ... */ fixable: "safe" },
  check(ctx) { /* ... */ },
  fix(ctx) {
    ctx.pkg.sideEffects = false;
    return { message: "added sideEffects: false", pkgModified: true };
  },
};
```

- `"safe"` — applied with `--fix`
- `"unsafe"` — only applied with `--fix --unsafe`
