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
| `entry` | `string \| string[] \| Record<string, string>` | auto-detected | Entry point(s) |
| `formats` | `("esm" \| "cjs" \| "iife")[]` | `["esm"]` | Output formats |
| `outDir` | `string` | `"dist"` | Output directory |
| `dts` | `boolean` | `true` | Generate `.d.ts` files |
| `dtsBundle` | `boolean` | `false` | Bundle `.d.ts` files into single-file declarations per entry |
| `dtsResolve` | `boolean` | `false` | Resolve external package types into bundled `.d.ts` |
| `sourcemap` | `boolean` | `false` | Generate sourcemaps |
| `clean` | `boolean` | `true` | Clean outDir before build |
| `minify` | `boolean` | `false` | Minify output |
| `splitting` | `boolean` | `false` | Enable code splitting (ESM only, auto-enabled for multi-entry) |
| `target` | `string` | — | esbuild target (e.g. `"es2022"`, `"node18"`) |
| `platform` | `"node" \| "browser" \| "neutral"` | — | Target platform |
| `external` | `(string \| RegExp)[]` | — | Packages to exclude from bundle |
| `noExternal` | `string[]` | — | Force-bundle specific packages |
| `define` | `Record<string, string>` | — | Compile-time constants |
| `banner` | `{ js?: string }` | — | Prepend text to output files |
| `footer` | `{ js?: string }` | — | Append text to output files |
| `cjsInterop` | `boolean` | `true` | Enable CJS interop (consumers don't need `.default`) |
| `esbuildPlugins` | `Plugin[]` | — | Pass esbuild plugins directly |
| `loader` | `Record<string, Loader>` | — | Custom esbuild loaders by extension |
| `replaceNodeEnv` | `boolean` | — | Replace `process.env.NODE_ENV` (auto-enabled when minify is true) |
| `globalName` | `string` | — | Global variable name for IIFE builds |
| `onSuccess` | `string \| () => void` | — | Run a command or callback after successful build |
| `treeshake` | `boolean \| { ignoreAnnotations?: boolean }` | — | Esbuild treeshake configuration |
| `publicDir` | `string` | — | Copy static assets from this directory to outDir |
| `inject` | `string[]` | — | Files to inject into all bundles |
| `sizeLimits` | `Record<string, string>` | — | Size budget limits — fail build if any file exceeds the limit |
| `shims` | `boolean` | `true` | Inject `__dirname`/`__filename`/`import.meta.url` shims into CJS output |
