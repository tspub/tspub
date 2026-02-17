import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { mkdtemp, cp, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { bundleDts } from "../../src/builder/dts-bundle.js";

const FIXTURES = join(__dirname, "../fixtures/dts-bundle");

async function setupFixture(name: string): Promise<string> {
  const tmp = await mkdtemp(join(tmpdir(), `dts-bundle-test-${name}-`));
  await cp(join(FIXTURES, name), tmp, { recursive: true });
  return tmp;
}

async function readOutput(dir: string, file = "index.d.ts"): Promise<string> {
  return readFile(join(dir, file), "utf-8");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("bundleDts", () => {
  describe("basic: export *, named re-exports, default export", () => {
    it("inlines all declarations into a single file", async () => {
      const dir = await setupFixture("basic");
      await bundleDts({ outDir: dir, entries: ["index.d.ts"] });
      const output = await readOutput(dir);

      // Should contain inlined declarations
      expect(output).toContain("Config");
      expect(output).toContain("createConfig");
      expect(output).toContain("Greeter");

      // Should not contain relative imports
      expect(output).not.toMatch(/from\s+["']\./);
    });

    it("handles export { X as Y } renames", async () => {
      const dir = await setupFixture("basic");
      await bundleDts({ outDir: dir, entries: ["index.d.ts"] });
      const output = await readOutput(dir);

      // Should have the rename alias
      expect(output).toContain("HelloGreeter");
    });

    it("removes inlined files", async () => {
      const dir = await setupFixture("basic");
      await bundleDts({ outDir: dir, entries: ["index.d.ts"] });

      expect(await fileExists(join(dir, "utils.d.ts"))).toBe(false);
      expect(await fileExists(join(dir, "greeter.d.ts"))).toBe(false);
      expect(await fileExists(join(dir, "index.d.ts"))).toBe(true);
    });
  });

  describe("generics: generic interfaces, conditional types, mapped types", () => {
    it("preserves complex generic type signatures", async () => {
      const dir = await setupFixture("generics");
      await bundleDts({ outDir: dir, entries: ["index.d.ts"] });
      const output = await readOutput(dir);

      expect(output).toContain("Result");
      expect(output).toContain("Awaitable");
      expect(output).toContain("IsString");
      expect(output).toContain("Keys");
      expect(output).toContain("EventName");
      expect(output).toContain("InferArray");
      expect(output).toContain("infer");
      expect(output).not.toMatch(/from\s+["']\./);
    });
  });

  describe("namespace: declaration merging", () => {
    it("preserves interface + namespace with same name", async () => {
      const dir = await setupFixture("namespace");
      await bundleDts({ outDir: dir, entries: ["index.d.ts"] });
      const output = await readOutput(dir);

      expect(output).toContain("interface Foo");
      expect(output).toContain("namespace Foo");
      expect(output).toContain("Baz");
    });
  });

  describe("ambient: declare module augmentations", () => {
    it("preserves declare module blocks", async () => {
      const dir = await setupFixture("ambient");
      await bundleDts({ outDir: dir, entries: ["index.d.ts"] });
      const output = await readOutput(dir);

      expect(output).toContain("init");
      expect(output).toContain('declare module "my-lib"');
      expect(output).toContain("CustomType");
    });
  });

  describe("collision: same-name declarations from different files", () => {
    it("renames colliding declarations with $N suffix", async () => {
      const dir = await setupFixture("collision");
      await bundleDts({ outDir: dir, entries: ["index.d.ts"] });
      const output = await readOutput(dir);

      // One should keep "Options", the other should be "Options$1"
      expect(output).toContain("Options");
      expect(output).toMatch(/Options\$1/);
      // Both should be present
      expect(output).toContain("host");
      expect(output).toContain("port");
    });
  });

  describe("export-equals: export = pattern", () => {
    it("handles export = correctly", async () => {
      const dir = await setupFixture("export-equals");
      await bundleDts({ outDir: dir, entries: ["index.d.ts"] });
      const output = await readOutput(dir);

      expect(output).toContain("main");
      expect(output).toContain("Config");
      expect(output).toContain("debug");
    });
  });

  describe("overloads: function overloads", () => {
    it("preserves all overload signatures", async () => {
      const dir = await setupFixture("overloads");
      await bundleDts({ outDir: dir, entries: ["index.d.ts"] });
      const output = await readOutput(dir);

      // Should have all three overloads
      const parseCount = (output.match(/function parse/g) || []).length;
      expect(parseCount).toBeGreaterThanOrEqual(3);
      expect(output).toContain("string");
      expect(output).toContain("Buffer");
      expect(output).toContain("strict");
    });
  });

  describe("triple-slash: reference preservation", () => {
    it("preserves and deduplicates triple-slash references", async () => {
      const dir = await setupFixture("triple-slash");
      await bundleDts({ outDir: dir, entries: ["index.d.ts"] });
      const output = await readOutput(dir);

      expect(output).toContain('/// <reference types="node" />');
      // Should be deduplicated (only one instance)
      const refCount = (output.match(/\/\/\/ <reference types="node" \/>/g) || []).length;
      expect(refCount).toBe(1);

      expect(output).toContain("listen");
      expect(output).toContain("close");
    });
  });

  describe("tree-shake: unused types excluded", () => {
    it("includes types used by public API", async () => {
      const dir = await setupFixture("tree-shake");
      await bundleDts({ outDir: dir, entries: ["index.d.ts"] });
      const output = await readOutput(dir);

      expect(output).toContain("PublicApi");
      expect(output).toContain("InternalHelper");
    });

    it("excludes types not reachable from exports", async () => {
      const dir = await setupFixture("tree-shake");
      await bundleDts({ outDir: dir, entries: ["index.d.ts"] });
      const output = await readOutput(dir);

      expect(output).not.toContain("UnusedType");
      expect(output).not.toContain("unusedFunction");
    });
  });

  describe("export-type: type-only exports and imports", () => {
    it("inlines type-only exported declarations", async () => {
      const dir = await setupFixture("export-type");
      await bundleDts({ outDir: dir, entries: ["index.d.ts"] });
      const output = await readOutput(dir);

      expect(output).toContain("Config");
      expect(output).toContain("debug");
      expect(output).toContain("createApp");
      expect(output).not.toMatch(/from\s+["']\./);
    });

    it("emits export type for type-only renamed exports", async () => {
      const dir = await setupFixture("export-type");
      await bundleDts({ outDir: dir, entries: ["index.d.ts"] });
      const output = await readOutput(dir);

      // Theme is re-exported as AppTheme via export type { Theme as AppTheme }
      expect(output).toContain("Theme");
      expect(output).toMatch(/export\s+type\s*\{.*AppTheme.*\}/);
    });

    it("includes import type dependencies transitively", async () => {
      const dir = await setupFixture("export-type");
      await bundleDts({ outDir: dir, entries: ["index.d.ts"] });
      const output = await readOutput(dir);

      // Config is used by createApp via import type — should be included
      expect(output).toContain("Config");
      expect(output).toContain("port");
    });
  });

  describe("collision-refs: AST-based rename of colliding names including references", () => {
    it("renames both declaration and type references to colliding name", async () => {
      const dir = await setupFixture("collision-refs");
      await bundleDts({ outDir: dir, entries: ["index.d.ts"] });
      const output = await readOutput(dir);

      // Both Handler types should be present
      expect(output).toContain("Handler");
      expect(output).toMatch(/Handler\$1/);

      // Both Payload types should be present (collision)
      expect(output).toContain("Payload");
      expect(output).toMatch(/Payload\$1/);

      // The renamed Handler$1 should reference Payload$1, not Payload
      // Find the line with Handler$1 and verify its Payload reference is also renamed
      const lines = output.split("\n");
      const handler1Line = lines.find(l => l.includes("Handler$1"));
      expect(handler1Line).toBeDefined();
      expect(handler1Line).toContain("Payload$1");
    });
  });
});
