import { describe, it, expect } from "vitest";
import { importsFieldRule } from "../../../src/checker/rules/exports/imports-field.js";

const baseCtx = {
  dir: "/tmp",
  compilerOptions: null,
  hasBuildOutput: false,
  distFiles: [],
  allJsFiles: [],
  hasUnresolvedExtends: false,
};

describe("exports/imports-field check", () => {
  it("returns empty when no imports field", async () => {
    const results = await importsFieldRule.check({ ...baseCtx, pkg: {} });
    expect(results).toHaveLength(0);
  });

  it("returns empty when imports is not an object", async () => {
    const results = await importsFieldRule.check({
      ...baseCtx,
      pkg: { imports: "invalid" as unknown },
    });
    expect(results).toHaveLength(0);
  });

  it("passes with valid # keys and ./ values", async () => {
    const results = await importsFieldRule.check({
      ...baseCtx,
      pkg: { imports: { "#utils": "./src/utils.js" } },
    });
    expect(results).toHaveLength(0);
  });

  it("passes with # value (self-referencing)", async () => {
    const results = await importsFieldRule.check({
      ...baseCtx,
      pkg: { imports: { "#internal": "#other" } },
    });
    expect(results).toHaveLength(0);
  });

  it("errors when key missing #", async () => {
    const results = await importsFieldRule.check({
      ...baseCtx,
      pkg: { imports: { utils: "./src/utils.js" } },
    });
    expect(results.some((d) => d.message.includes('must start with "#"'))).toBe(
      true,
    );
  });

  it("errors when value is a bare specifier (not ./ or #)", async () => {
    const results = await importsFieldRule.check({
      ...baseCtx,
      pkg: { imports: { "#utils": "lodash" } },
    });
    expect(
      results.some((d) => d.message.includes('must start with "./" or "#"')),
    ).toBe(true);
  });

  it("errors for both invalid key and invalid value", async () => {
    const results = await importsFieldRule.check({
      ...baseCtx,
      pkg: { imports: { utils: "lodash" } },
    });
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.some((d) => d.message.includes('must start with "#"'))).toBe(
      true,
    );
    expect(
      results.some((d) => d.message.includes('must start with "./" or "#"')),
    ).toBe(true);
  });

  it("validates nested condition objects", async () => {
    const results = await importsFieldRule.check({
      ...baseCtx,
      pkg: {
        imports: {
          "#dep": {
            node: "dep-node",
            default: "dep-default",
          },
        },
      },
    });
    // Both nested values "dep-node" and "dep-default" are bare specifiers
    expect(
      results.filter((d) => d.message.includes('must start with "./" or "#"'))
        .length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("passes nested condition objects with valid values", async () => {
    const results = await importsFieldRule.check({
      ...baseCtx,
      pkg: {
        imports: {
          "#dep": {
            node: "./src/dep-node.js",
            default: "./src/dep-default.js",
          },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("handles multiple imports keys", async () => {
    const results = await importsFieldRule.check({
      ...baseCtx,
      pkg: {
        imports: {
          "#a": "./src/a.js",
          "#b": "bare-module",
          nohash: "./src/nohash.js",
        },
      },
    });
    expect(
      results.some((d) => d.message.includes('"nohash" must start with "#"')),
    ).toBe(true);
    expect(
      results.some((d) =>
        d.message.includes('"#b" value "bare-module" must start with "./"'),
      ),
    ).toBe(true);
  });

  it("validates deeply nested condition objects", async () => {
    const results = await importsFieldRule.check({
      ...baseCtx,
      pkg: {
        imports: {
          "#deep": {
            node: {
              import: "bare-import",
              require: "./src/deep.cjs",
            },
          },
        },
      },
    });
    expect(
      results.some((d) =>
        d.message.includes('"bare-import" must start with "./" or "#"'),
      ),
    ).toBe(true);
  });
});
