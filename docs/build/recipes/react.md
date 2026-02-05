# React Library

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
  "name": "my-react-lib",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "peerDependencies": {
    "react": ">=18"
  },
  "sideEffects": false
}
```

## Tips

- Set `"sideEffects": false` for tree-shaking
- Use `peerDependencies` for React, not `dependencies`
- Export components individually for better tree-shaking
