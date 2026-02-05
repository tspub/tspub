import { describe, it, expect, afterEach } from "vitest";
import { scaffold } from "../../src/scaffold/index.js";
import { rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("E2E: Scaffold Features", () => {
  const tmps: string[] = [];

  afterEach(async () => {
    for (const dir of tmps) {
      await rm(dir, { recursive: true, force: true });
    }
    tmps.length = 0;
  });

  function tmpDir() {
    const tmp = join(tmpdir(), `tspub-scaffold-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    tmps.push(tmp);
    return tmp;
  }

  it("scaffold ESM package creates complete project structure", async () => {
    const dir = tmpDir();
    await scaffold({ name: "my-esm-pkg", dualPublish: false, react: false, monorepo: false, dir });
    const root = join(dir, "my-esm-pkg");

    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf-8"));
    expect(pkg.name).toBe("my-esm-pkg");
    expect(pkg.type).toBe("module");
    expect(pkg.version).toBe("0.1.0");
    expect(pkg.exports).toBeDefined();
    expect(pkg.exports["."]).toBeDefined();
    expect(pkg.files).toContain("dist");
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();

    const tsconfig = JSON.parse(await readFile(join(root, "tsconfig.json"), "utf-8"));
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.declaration).toBe(true);
    expect(tsconfig.compilerOptions.target).toBeDefined();

    const indexTs = await readFile(join(root, "src/index.ts"), "utf-8");
    expect(indexTs).toContain("export");

    const mainExport = pkg.exports["."];
    if (typeof mainExport === "object") {
      expect(mainExport.require).toBeUndefined();
    }
  });

  it("scaffold dual-publish package has both import and require conditions", async () => {
    const dir = tmpDir();
    await scaffold({ name: "my-dual-pkg", dualPublish: true, react: false, monorepo: false, dir });
    const root = join(dir, "my-dual-pkg");

    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf-8"));
    expect(pkg.name).toBe("my-dual-pkg");

    const mainExport = pkg.exports?.["."];
    expect(mainExport).toBeDefined();
    expect(typeof mainExport).toBe("object");
    expect(mainExport).not.toBeNull();

    const importCond = mainExport.import;
    expect(importCond).toBeDefined();

    const requireCond = mainExport.require;
    expect(requireCond).toBeDefined();

    expect(pkg.scripts.build).toMatch(/esm.*cjs|cjs.*esm/);
  });

  it("scaffold monorepo package has composite tsconfig and public access", async () => {
    const dir = tmpDir();
    await scaffold({ name: "@scope/mono-pkg", dualPublish: false, react: false, monorepo: true, dir });
    const root = join(dir, "@scope/mono-pkg");

    const tsconfig = JSON.parse(await readFile(join(root, "tsconfig.json"), "utf-8"));
    expect(tsconfig.compilerOptions.composite).toBe(true);

    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf-8"));
    expect(pkg.publishConfig).toBeDefined();
    expect(pkg.publishConfig.access).toBe("public");
  });

  it("scaffold react package has JSX config and react peer dependencies", async () => {
    const dir = tmpDir();
    await scaffold({ name: "my-react-pkg", dualPublish: false, react: true, monorepo: false, dir });
    const root = join(dir, "my-react-pkg");

    const tsconfig = JSON.parse(await readFile(join(root, "tsconfig.json"), "utf-8"));
    expect(tsconfig.compilerOptions.jsx).toBeDefined();
    expect(tsconfig.compilerOptions.jsx).toMatch(/react/i);

    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf-8"));
    expect(pkg.peerDependencies).toBeDefined();
    expect(pkg.peerDependencies.react).toBeDefined();
  });
});
