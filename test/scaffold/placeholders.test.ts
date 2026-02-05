import { describe, it, expect } from "vitest";
import { generatePackageJson } from "../../src/scaffold/templates/package.json.js";
import { generateReadme } from "../../src/scaffold/templates/readme.js";
import { generateLicense } from "../../src/scaffold/templates/license.js";
import type { ScaffoldOptions } from "../../src/scaffold/index.js";

const baseOptions: ScaffoldOptions = {
  name: "test-pkg",
  dualPublish: false,
  react: false,
  monorepo: false,
  dir: "/tmp",
  author: "Jane Doe",
  description: "A test package",
  license: "MIT",
};

describe("scaffold placeholders", () => {
  it("author and description appear in package.json", () => {
    const json = generatePackageJson(baseOptions);
    const pkg = JSON.parse(json);
    expect(pkg.author).toBe("Jane Doe");
    expect(pkg.description).toBe("A test package");
  });

  it("author appears in README", () => {
    const readme = generateReadme(baseOptions);
    expect(readme).toContain("Jane Doe");
    expect(readme).not.toContain("USERNAME");
  });

  it("LICENSE has author name", () => {
    const license = generateLicense(baseOptions);
    expect(license).toContain("Jane Doe");
  });

  it("ISC license works", () => {
    const license = generateLicense({ ...baseOptions, license: "ISC" });
    expect(license).toContain("ISC License");
    expect(license).toContain("Jane Doe");
  });

  it("Apache-2.0 license works", () => {
    const license = generateLicense({ ...baseOptions, license: "Apache-2.0" });
    expect(license).toContain("Apache License");
    expect(license).toContain("Jane Doe");
  });

  it("description appears in README", () => {
    const readme = generateReadme(baseOptions);
    expect(readme).toContain("A test package");
  });
});
