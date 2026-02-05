# Node CLI Tool

## Config

```typescript
// tspub.config.ts
export default {
  build: {
    entry: ["src/index.ts", "src/bin.ts"],
    formats: ["esm"],
    dts: true,
  },
};
```

## package.json

```json
{
  "name": "my-cli",
  "type": "module",
  "bin": {
    "my-cli": "./dist/bin.js"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

## bin.ts

```typescript
#!/usr/bin/env node
import { run } from "./index.js";
run(process.argv.slice(2));
```

::: warning
The `files/bin-shebang` rule will warn if your bin file is missing the `#!/usr/bin/env node` shebang.
:::

## Tips

- Keep the bin entry point thin — import the actual logic from `index.ts`
- Export the programmatic API from `index.ts` so others can use it
- `tspub check` validates both the exports and the bin shebang
