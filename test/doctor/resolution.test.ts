import { describe, it, expect } from "vitest";
import { debugResolution } from "../../src/doctor/resolution.js";

describe("doctor: resolution debugging", () => {
  it("errors when no exports field", () => {
    const diags = debugResolution({ name: "test" }, ".");
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("error");
    expect(diags[0]!.message).toContain("No \"exports\" field");
  });

  it("errors and suggests for missing subpath", () => {
    const diags = debugResolution(
      { exports: { ".": "./dist/index.js" } },
      "./utils",
    );
    expect(diags.length).toBeGreaterThanOrEqual(2);
    expect(diags[0]!.severity).toBe("error");
    expect(diags[0]!.message).toContain("not found");
    const suggestion = diags.find((d) => d.message.includes("Add"));
    expect(suggestion).toBeDefined();
    expect(suggestion!.severity).toBe("info");
  });

  it("resolves string export", () => {
    const diags = debugResolution(
      { exports: { ".": "./dist/index.js" } },
      ".",
    );
    expect(diags.some((d) => d.severity === "info")).toBe(true);
    expect(diags.some((d) => d.message.includes("resolves to"))).toBe(true);
  });

  it("resolves conditional export and lists conditions", () => {
    const diags = debugResolution(
      { exports: { ".": { import: "./dist/index.js", require: "./dist/index.cjs" } } },
      ".",
    );
    const condInfo = diags.find((d) => d.message.includes("conditions"));
    expect(condInfo).toBeDefined();
    expect(condInfo!.message).toContain("import");
    expect(condInfo!.message).toContain("require");
  });

  it("warns when types condition is missing", () => {
    const diags = debugResolution(
      { exports: { ".": { import: "./dist/index.js" } } },
      ".",
    );
    const typesWarn = diags.find((d) => d.severity === "warning" && d.message.includes("types"));
    expect(typesWarn).toBeDefined();
  });

  it("no types warning when nested types exist", () => {
    const diags = debugResolution(
      {
        exports: {
          ".": {
            import: { types: "./dist/index.d.ts", default: "./dist/index.js" },
          },
        },
      },
      ".",
    );
    const typesWarn = diags.find((d) => d.severity === "warning" && d.message.includes("types"));
    expect(typesWarn).toBeUndefined();
  });

  it("normalizes subpath without leading dot", () => {
    const diags = debugResolution(
      { exports: { "./utils": "./dist/utils.js" } },
      "utils",
    );
    const info = diags.find((d) => d.severity === "info");
    expect(info).toBeDefined();
  });

  it("lists available subpaths on missing export", () => {
    const diags = debugResolution(
      { exports: { ".": "./dist/index.js", "./utils": "./dist/utils.js" } },
      "./missing",
    );
    const errMsg = diags.find((d) => d.severity === "error");
    expect(errMsg).toBeDefined();
    expect(errMsg!.message).toContain("./utils");
    expect(errMsg!.message).toContain(".");
  });
});
