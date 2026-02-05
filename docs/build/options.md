# Build Options

Configure in `tspub.config.ts`:

```typescript
export default {
  build: {
    entry: "src/index.ts",
    formats: ["esm", "cjs"],
    outDir: "dist",
    dts: true,
    sourcemap: true,
    clean: true,
  },
};
```

## Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entry` | `string \| string[]` | auto-detected | Entry point(s) |
| `formats` | `("esm" \| "cjs")[]` | `["esm"]` | Output formats |
| `outDir` | `string` | `"dist"` | Output directory |
| `dts` | `boolean` | `true` | Generate `.d.ts` files |
| `sourcemap` | `boolean` | `false` | Generate sourcemaps |
| `clean` | `boolean` | `true` | Clean outDir before build |
