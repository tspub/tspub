// Bootstrap: build tspub from source using esbuild directly.
// Used on fresh clones where dist/ doesn't exist yet.
// After this, `npm run build` (which uses the self-hosted tspub) works.

import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: {
    index: "src/index.ts",
    "bin/tspub": "bin/tspub.ts",
    "type-tester/assertions": "src/type-tester/assertions.ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node18",
  outdir: "dist",
  splitting: true,
  sourcemap: true,
  external: [
    "typescript",
    "commander",
    "chalk",
    "prompts",
    "esbuild",
    "fast-glob",
  ],
});

console.log("Bootstrap complete — run `npm run build` for a full build with DTS.");
