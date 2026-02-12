import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { sensitiveRule } from "../../../src/checker/rules/files/sensitive.js";
import type { CheckContext } from "../../../src/checker/framework/types.js";
import type { PackageJson } from "../../../src/shared/package-json.js";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), "tspub-test-sensitive-" + Date.now());
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

function makeCtx(
  pkg: PackageJson,
  overrides?: Partial<CheckContext>,
): CheckContext {
  return {
    pkg,
    dir: testDir,
    compilerOptions: null,
    hasBuildOutput: true,
    distFiles: [],
    allJsFiles: [],
    hasUnresolvedExtends: false,
    ...overrides,
  };
}

describe("files/sensitive", () => {
  it("has correct metadata", () => {
    expect(sensitiveRule.meta.id).toBe("files/sensitive");
    expect(sensitiveRule.meta.category).toBe("files");
    expect(sensitiveRule.meta.defaultSeverity).toBe("error");
    expect(sensitiveRule.meta.fixable).toBe(false);
  });

  it("is not fixable", () => {
    expect(sensitiveRule.fix).toBeUndefined();
  });

  // ---- Root sensitive files ----

  it("returns no diagnostics when no sensitive files exist", async () => {
    const diags = await sensitiveRule.check(makeCtx({}));
    expect(diags).toHaveLength(0);
  });

  it("errors when .env exists and no files field (all files published)", async () => {
    await writeFile(join(testDir, ".env"), "SECRET=abc");
    const diags = await sensitiveRule.check(makeCtx({}));
    expect(diags.some((d) => d.message.includes(".env"))).toBe(true);
    expect(diags[0]!.severity).toBe("error");
  });

  it("errors when credentials.json exists and no files field", async () => {
    await writeFile(join(testDir, "credentials.json"), "{}");
    const diags = await sensitiveRule.check(makeCtx({}));
    expect(diags.some((d) => d.message.includes("credentials.json"))).toBe(true);
  });

  it("errors when id_rsa exists and no files field", async () => {
    await writeFile(join(testDir, "id_rsa"), "ssh key content");
    const diags = await sensitiveRule.check(makeCtx({}));
    expect(diags.some((d) => d.message.includes("id_rsa"))).toBe(true);
  });

  it("errors when id_ed25519 exists and no files field", async () => {
    await writeFile(join(testDir, "id_ed25519"), "ssh key content");
    const diags = await sensitiveRule.check(makeCtx({}));
    expect(diags.some((d) => d.message.includes("id_ed25519"))).toBe(true);
  });

  it("errors when .aws exists and no files field", async () => {
    // .aws is typically a directory, but the rule checks fileExists
    await writeFile(join(testDir, ".aws"), "aws creds");
    const diags = await sensitiveRule.check(makeCtx({}));
    expect(diags.some((d) => d.message.includes(".aws"))).toBe(true);
  });

  it("errors when .env.local exists and no files field", async () => {
    await writeFile(join(testDir, ".env.local"), "SECRET=local");
    const diags = await sensitiveRule.check(makeCtx({}));
    expect(diags.some((d) => d.message.includes(".env.local"))).toBe(true);
  });

  it("errors when .env.production exists and no files field", async () => {
    await writeFile(join(testDir, ".env.production"), "SECRET=prod");
    const diags = await sensitiveRule.check(makeCtx({}));
    expect(diags.some((d) => d.message.includes(".env.production"))).toBe(true);
  });

  it("reports multiple sensitive files when several exist", async () => {
    await writeFile(join(testDir, ".env"), "SECRET=abc");
    await writeFile(join(testDir, "id_rsa"), "key");
    await writeFile(join(testDir, "credentials.json"), "{}");
    const diags = await sensitiveRule.check(makeCtx({}));
    expect(diags.length).toBeGreaterThanOrEqual(3);
  });

  // ---- files field filtering ----

  it("does not flag sensitive file when files field excludes it", async () => {
    await writeFile(join(testDir, ".env"), "SECRET=abc");
    const diags = await sensitiveRule.check(makeCtx({ files: ["dist"] }));
    // files field is ["dist"], and ".env" does not match "dist" nor "." nor startsWith("dist/")
    expect(diags.some((d) => d.message.includes('"".env""') || d.message.includes('".env"'))).toBe(false);
  });

  it("flags sensitive file when files field includes it by exact name", async () => {
    await writeFile(join(testDir, ".env"), "SECRET=abc");
    const diags = await sensitiveRule.check(makeCtx({ files: [".env", "dist"] }));
    expect(diags.some((d) => d.message.includes(".env"))).toBe(true);
  });

  it("flags sensitive file when files field includes '.'", async () => {
    await writeFile(join(testDir, ".env"), "SECRET=abc");
    const diags = await sensitiveRule.check(makeCtx({ files: ["."] }));
    expect(diags.some((d) => d.message.includes(".env"))).toBe(true);
  });

  it("flags sensitive file when files field has a prefix of the sensitive path", async () => {
    // .aws directory is sensitive; if files includes ".aws" that's an exact match
    await writeFile(join(testDir, ".aws"), "creds");
    const diags = await sensitiveRule.check(makeCtx({ files: [".aws"] }));
    expect(diags.some((d) => d.message.includes(".aws"))).toBe(true);
  });

  // ---- .npmrc handling ----

  it("does not flag .npmrc that has no auth tokens", async () => {
    await writeFile(join(testDir, ".npmrc"), "registry=https://registry.npmjs.org/");
    const diags = await sensitiveRule.check(makeCtx({}));
    expect(diags.some((d) => d.message.includes(".npmrc"))).toBe(false);
  });

  it("flags .npmrc with _authToken", async () => {
    await writeFile(join(testDir, ".npmrc"), "//registry.npmjs.org/:_authToken=abc123");
    const diags = await sensitiveRule.check(makeCtx({}));
    expect(diags.some((d) => d.message.includes(".npmrc") && d.message.includes("auth tokens"))).toBe(true);
  });

  it("flags .npmrc with _auth=", async () => {
    await writeFile(join(testDir, ".npmrc"), "_auth=dXNlcjpwYXNz");
    const diags = await sensitiveRule.check(makeCtx({}));
    expect(diags.some((d) => d.message.includes(".npmrc"))).toBe(true);
  });

  it("flags .npmrc with _password", async () => {
    await writeFile(join(testDir, ".npmrc"), "//registry.npmjs.org/:_password=abc123");
    const diags = await sensitiveRule.check(makeCtx({}));
    expect(diags.some((d) => d.message.includes(".npmrc"))).toBe(true);
  });

  it("does not flag .npmrc when files field excludes it", async () => {
    await writeFile(join(testDir, ".npmrc"), "//registry.npmjs.org/:_authToken=abc123");
    const diags = await sensitiveRule.check(makeCtx({ files: ["dist"] }));
    expect(diags.some((d) => d.message.includes(".npmrc"))).toBe(false);
  });

  it("flags .npmrc with auth when files field includes it", async () => {
    await writeFile(join(testDir, ".npmrc"), "//registry.npmjs.org/:_authToken=abc123");
    const diags = await sensitiveRule.check(makeCtx({ files: [".npmrc"] }));
    expect(diags.some((d) => d.message.includes(".npmrc"))).toBe(true);
  });

  it("flags .npmrc with auth when files field includes '.'", async () => {
    await writeFile(join(testDir, ".npmrc"), "_auth=token");
    const diags = await sensitiveRule.check(makeCtx({ files: ["."] }));
    expect(diags.some((d) => d.message.includes(".npmrc"))).toBe(true);
  });

  // ---- dist sensitive files ----

  it("errors when distFiles contain a sensitive file path", async () => {
    const diags = await sensitiveRule.check(
      makeCtx({}, { distFiles: ["dist/.env", "dist/index.js"] }),
    );
    expect(diags.some((d) => d.message.includes(".env") && d.message.includes("dist/"))).toBe(true);
    expect(diags[0]!.severity).toBe("error");
  });

  it("errors when distFiles contain credentials.json", async () => {
    const diags = await sensitiveRule.check(
      makeCtx({}, { distFiles: ["dist/credentials.json"] }),
    );
    expect(diags.some((d) => d.message.includes("credentials.json"))).toBe(true);
  });

  it("errors when distFiles contain id_rsa anywhere in path", async () => {
    const diags = await sensitiveRule.check(
      makeCtx({}, { distFiles: ["dist/keys/id_rsa"] }),
    );
    expect(diags.some((d) => d.message.includes("id_rsa"))).toBe(true);
  });

  it("does not flag clean distFiles", async () => {
    const diags = await sensitiveRule.check(
      makeCtx({}, { distFiles: ["dist/index.js", "dist/utils.js"] }),
    );
    expect(diags).toHaveLength(0);
  });

  it("reports both root and dist sensitive files", async () => {
    await writeFile(join(testDir, ".env"), "SECRET=abc");
    const diags = await sensitiveRule.check(
      makeCtx({}, { distFiles: ["dist/.env"] }),
    );
    // Should have at least 2: one for root .env, one for dist .env
    expect(diags.length).toBeGreaterThanOrEqual(2);
  });
});
