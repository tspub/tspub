import { join } from "node:path";
import { accessSync, readdirSync } from "node:fs";
import type { Rule } from "../../framework/types.js";

const LICENSE_NAMES = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "LICENCE",
  "LICENCE.md",
  "LICENCE.txt",
  "license",
  "License",
];

function hasLicense(dir: string): boolean {
  for (const name of LICENSE_NAMES) {
    try {
      accessSync(join(dir, name));
      return true;
    } catch {
      // not found
    }
  }
  try {
    const files = readdirSync(dir);
    if (files.some((f) => /^licen[sc]e[-.]?/i.test(f))) {
      return true;
    }
  } catch {
    // not readable
  }
  return false;
}

export const licenseFileRule: Rule = {
  meta: {
    id: "metadata/license-file",
    description: "Check that a LICENSE file exists",
    defaultSeverity: "warning",
    fixable: false,
    category: "metadata",
  },
  check(ctx) {
    const found =
      hasLicense(ctx.dir) ||
      hasLicense(join(ctx.dir, "..")) ||
      hasLicense(join(ctx.dir, "..", ".."));

    if (!found) {
      return [{ severity: "warning", message: "No LICENSE file found" }];
    }
    return [];
  },
};
