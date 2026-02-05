import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Rule } from "../../framework/types.js";

const SPDX_PATTERNS: [RegExp, string][] = [
  [/\bMIT\b/i, "MIT"],
  [/\bApache\s*(?:License\s*)?(?:,?\s*Version\s*)?2(?:\.0)?/i, "Apache-2.0"],
  [/\bISC\b/, "ISC"],
  [/\bBSD[\s-]*2[\s-]*Clause\b/i, "BSD-2-Clause"],
  [/\bBSD[\s-]*3[\s-]*Clause\b/i, "BSD-3-Clause"],
  [/\bMPL[\s-]*2(?:\.0)?\b/i, "MPL-2.0"],
  [/\bGPL[\s-]*3/i, "GPL-3.0-only"],
  [/\bGPL[\s-]*2/i, "GPL-2.0-only"],
  [/\bLGPL[\s-]*3/i, "LGPL-3.0-only"],
  [/\bUnlicense\b/i, "Unlicense"],
];

async function detectLicenseFromFile(dir: string): Promise<string | null> {
  for (const name of ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "LICENCE.md"]) {
    try {
      const content = await readFile(join(dir, name), "utf-8");
      for (const [pattern, spdx] of SPDX_PATTERNS) {
        if (pattern.test(content)) return spdx;
      }
      return null; // file exists but can't detect
    } catch {
      continue;
    }
  }
  return null;
}

export const licenseRule: Rule = {
  meta: {
    id: "metadata/license",
    description: "Check that license field exists in package.json",
    defaultSeverity: "warning",
    fixable: "unsafe",
    category: "metadata",
  },
  check(ctx) {
    if (!ctx.pkg.license) {
      return [
        {
          severity: "warning",
          message: '"license" field missing in package.json',
        },
      ];
    }
    return [];
  },
  async fix(ctx) {
    if (ctx.pkg.license) return { message: "", pkgModified: false };

    const detected = await detectLicenseFromFile(ctx.dir);
    if (!detected) {
      return { message: "", pkgModified: false };
    }

    ctx.pkg.license = detected;
    return { message: `set "license": "${detected}"`, pkgModified: true };
  },
};
