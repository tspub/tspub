import { describe, it, expect } from "vitest";
import { bumpVersion, bumpPrerelease } from "../../src/publisher/version-bump.js";

describe("publish: bumpVersion exhaustive", () => {
  it("patch from 0.0.0", () => expect(bumpVersion("0.0.0", "patch")).toBe("0.0.1"));
  it("minor from 0.0.0", () => expect(bumpVersion("0.0.0", "minor")).toBe("0.1.0"));
  it("major from 0.0.0", () => expect(bumpVersion("0.0.0", "major")).toBe("1.0.0"));
  it("patch from 9.9.9", () => expect(bumpVersion("9.9.9", "patch")).toBe("9.9.10"));
  it("minor from 1.9.5", () => expect(bumpVersion("1.9.5", "minor")).toBe("1.10.0"));
  it("major from 1.2.3", () => expect(bumpVersion("1.2.3", "major")).toBe("2.0.0"));

  it("strips prerelease before bumping", () => {
    expect(bumpVersion("1.0.0-beta.1", "patch")).toBe("1.0.1");
    expect(bumpVersion("2.3.0-rc.5", "minor")).toBe("2.4.0");
    expect(bumpVersion("1.0.0-alpha.0", "major")).toBe("2.0.0");
  });

  it("accepts explicit version string", () => {
    expect(bumpVersion("1.0.0", "3.2.1")).toBe("3.2.1");
    expect(bumpVersion("0.0.0", "1.0.0-beta.1")).toBe("1.0.0-beta.1");
  });

  it("throws on invalid bump string", () => {
    expect(() => bumpVersion("1.0.0", "foo")).toThrow("Invalid bump");
    expect(() => bumpVersion("1.0.0", "1.2")).toThrow("Invalid bump");
    expect(() => bumpVersion("1.0.0", "")).toThrow("Invalid bump");
    expect(() => bumpVersion("1.0.0", "latest")).toThrow("Invalid bump");
  });
});

describe("publish: bumpPrerelease exhaustive", () => {
  it("creates beta.0 from stable with no bump arg", () => {
    expect(bumpPrerelease("1.0.0", "beta")).toBe("1.0.1-beta.0");
  });

  it("creates beta.0 with explicit minor bump", () => {
    expect(bumpPrerelease("1.0.0", "beta", "minor")).toBe("1.1.0-beta.0");
  });

  it("creates beta.0 with explicit major bump", () => {
    expect(bumpPrerelease("1.0.0", "beta", "major")).toBe("2.0.0-beta.0");
  });

  it("increments existing beta counter", () => {
    expect(bumpPrerelease("1.0.1-beta.0", "beta")).toBe("1.0.1-beta.1");
    expect(bumpPrerelease("1.0.1-beta.5", "beta")).toBe("1.0.1-beta.6");
    expect(bumpPrerelease("1.0.1-beta.99", "beta")).toBe("1.0.1-beta.100");
  });

  it("resets counter when explicit bump provided on existing prerelease", () => {
    expect(bumpPrerelease("1.0.1-beta.5", "beta", "minor")).toBe("1.1.0-beta.0");
    expect(bumpPrerelease("1.0.1-beta.5", "beta", "major")).toBe("2.0.0-beta.0");
  });

  it("switches tag creates new prerelease", () => {
    expect(bumpPrerelease("1.0.1-beta.3", "alpha")).toBe("1.0.2-alpha.0");
    expect(bumpPrerelease("1.0.1-beta.3", "rc")).toBe("1.0.2-rc.0");
  });

  it("handles alpha tag", () => {
    expect(bumpPrerelease("1.0.0", "alpha")).toBe("1.0.1-alpha.0");
    expect(bumpPrerelease("1.0.1-alpha.0", "alpha")).toBe("1.0.1-alpha.1");
  });

  it("handles rc tag", () => {
    expect(bumpPrerelease("2.0.0", "rc", "major")).toBe("3.0.0-rc.0");
  });
});
