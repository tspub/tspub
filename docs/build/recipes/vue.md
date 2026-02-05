# Vue Library

## Config

```typescript
// tspub.config.ts
export default {
  build: {
    entry: "src/index.ts",
    formats: ["esm", "cjs"],
    dts: true,
  },
};
```

## package.json

```json
{
  "name": "my-vue-lib",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "peerDependencies": {
    "vue": ">=3"
  },
  "sideEffects": false
}
```

## Tips

- Use `peerDependencies` for Vue
- `.vue` SFC files need a separate build step — tspub handles `.ts` entry points
- Re-export components from a `.ts` entry file
