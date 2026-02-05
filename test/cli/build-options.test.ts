import { describe, it, expect } from "vitest";
import { parseEntryFlag } from "../../src/cli/build.js";

describe("parseEntryFlag", () => {
  it("parses comma-separated paths as array", () => {
    expect(parseEntryFlag("src/index.ts,src/cli.ts")).toEqual([
      "src/index.ts",
      "src/cli.ts",
    ]);
  });

  it("returns single path as array", () => {
    expect(parseEntryFlag("src/index.ts")).toEqual(["src/index.ts"]);
  });

  it("parses name=path mappings as object", () => {
    expect(parseEntryFlag("index=src/index.ts,bin/cli=bin/cli.ts")).toEqual({
      index: "src/index.ts",
      "bin/cli": "bin/cli.ts",
    });
  });

  it("auto-derives names for entries without = in mixed mode", () => {
    expect(parseEntryFlag("index=src/index.ts,src/utils.ts")).toEqual({
      index: "src/index.ts",
      utils: "src/utils.ts",
    });
  });

  it("strips src/ prefix and extension for auto-derived names", () => {
    expect(parseEntryFlag("main=src/main.ts,src/lib/helper.tsx")).toEqual({
      main: "src/main.ts",
      "lib/helper": "src/lib/helper.tsx",
    });
  });

  it("trims whitespace around entries", () => {
    expect(parseEntryFlag(" index=src/index.ts , bin/cli=bin/cli.ts ")).toEqual({
      index: "src/index.ts",
      "bin/cli": "bin/cli.ts",
    });
  });
});
