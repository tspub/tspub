import { describe, it, expect } from "vitest";
import { SCAN_PROFILES } from "../../src/scanner/profiles.js";

describe("SCAN_PROFILES", () => {
  it("has strict profile with empty overrides", () => {
    expect(SCAN_PROFILES.strict).toBeDefined();
    expect(Object.keys(SCAN_PROFILES.strict!)).toHaveLength(0);
  });

  it("exports-only profile turns off non-exports rules", () => {
    expect(SCAN_PROFILES["exports-only"]).toBeDefined();

    const profile = SCAN_PROFILES["exports-only"]!;

    // Check that types rules are disabled
    expect(profile["types/false-cjs-esm"]).toBe("off");
    expect(profile["types/false-export-default"]).toBe("off");
    expect(profile["types/missing-export-equals"]).toBe("off");
    expect(profile["types/esm-dynamic-only"]).toBe("off");
    expect(profile["types/resolution"]).toBe("off");

    // Check that files rules are disabled
    expect(profile["files/sensitive"]).toBe("off");
    expect(profile["files/bin-executable"]).toBe("off");
    expect(profile["files/bin-shebang"]).toBe("off");
    expect(profile["files/duplicate-dep"]).toBe("off");
    expect(profile["files/files-field"]).toBe("off");
    expect(profile["files/format-validation"]).toBe("off");
    expect(profile["files/local-dependency"]).toBe("off");
    expect(profile["files/prepublish"]).toBe("off");

    // Check that metadata rules are disabled
    expect(profile["metadata/license"]).toBe("off");
    expect(profile["metadata/license-file"]).toBe("off");
    expect(profile["metadata/engines"]).toBe("off");
    expect(profile["metadata/repository"]).toBe("off");
    expect(profile["metadata/repository-format"]).toBe("off");
    expect(profile["metadata/deprecated-fields"]).toBe("off");
    expect(profile["metadata/peer-dep-conflict"]).toBe("off");
    expect(profile["metadata/side-effects"]).toBe("off");

    // Check that size rules are disabled
    expect(profile["size/package-size"]).toBe("off");
  });

  it("types-only profile turns off non-types rules", () => {
    expect(SCAN_PROFILES["types-only"]).toBeDefined();

    const profile = SCAN_PROFILES["types-only"]!;

    // Check that exports rules are disabled
    expect(profile["exports/type-module"]).toBe("off");
    expect(profile["exports/exports-field"]).toBe("off");
    expect(profile["exports/dot-entry"]).toBe("off");
    expect(profile["exports/types-order"]).toBe("off");
    expect(profile["exports/import-condition"]).toBe("off");
    expect(profile["exports/file-exists"]).toBe("off");
    expect(profile["exports/value-invalid"]).toBe("off");
    expect(profile["exports/default-last"]).toBe("off");
    expect(profile["exports/module-before-require"]).toBe("off");
    expect(profile["exports/format-mismatch"]).toBe("off");
    expect(profile["exports/types-format"]).toBe("off");
    expect(profile["exports/no-deprecated-subpath-mapping"]).toBe("off");
    expect(profile["exports/browser-conflict"]).toBe("off");
    expect(profile["exports/types-first"]).toBe("off");
    expect(profile["exports/esm-main-no-exports"]).toBe("off");
    expect(profile["exports/module-no-exports"]).toBe("off");
    expect(profile["exports/types-not-exported"]).toBe("off");
    expect(profile["exports/file-not-published"]).toBe("off");
    expect(profile["exports/glob-matched-files"]).toBe("off");

    // Check that files rules are disabled
    expect(profile["files/sensitive"]).toBe("off");
    expect(profile["files/bin-executable"]).toBe("off");
    expect(profile["files/bin-shebang"]).toBe("off");
    expect(profile["files/duplicate-dep"]).toBe("off");
    expect(profile["files/files-field"]).toBe("off");
    expect(profile["files/format-validation"]).toBe("off");
    expect(profile["files/local-dependency"]).toBe("off");
    expect(profile["files/prepublish"]).toBe("off");

    // Check that metadata rules are disabled
    expect(profile["metadata/license"]).toBe("off");
    expect(profile["metadata/license-file"]).toBe("off");
    expect(profile["metadata/engines"]).toBe("off");
    expect(profile["metadata/repository"]).toBe("off");
    expect(profile["metadata/repository-format"]).toBe("off");
    expect(profile["metadata/deprecated-fields"]).toBe("off");
    expect(profile["metadata/peer-dep-conflict"]).toBe("off");
    expect(profile["metadata/side-effects"]).toBe("off");

    // Check that size rules are disabled
    expect(profile["size/package-size"]).toBe("off");
  });

  it("has exactly three profiles", () => {
    const profiles = Object.keys(SCAN_PROFILES);
    expect(profiles).toHaveLength(3);
    expect(profiles).toContain("strict");
    expect(profiles).toContain("exports-only");
    expect(profiles).toContain("types-only");
  });

  it("all override values are valid severity or off", () => {
    for (const [profileName, profile] of Object.entries(SCAN_PROFILES)) {
      for (const [rule, severity] of Object.entries(profile)) {
        expect(
          severity === "off" ||
          severity === "error" ||
          severity === "warning" ||
          severity === "info"
        ).toBe(true);
      }
    }
  });
});
