export default {
  build: {
    entry: {
      index: "src/index.ts",
      "bin/tspub": "bin/tspub.ts",
      "type-tester/assertions": "src/type-tester/assertions.ts",
    },
    formats: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ["typescript"],
  },
};
