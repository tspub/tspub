import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { logger } from "../shared/logger.js";
import { generatePackageJson } from "./templates/package.json.js";
import { generateTsconfig } from "./templates/tsconfig.json.js";
import { generateIndexTs } from "./templates/index.ts.js";
import { generateTestTs } from "./templates/test.ts.js";
import { generateGitignore } from "./templates/gitignore.js";
import { generateNpmignore } from "./templates/npmignore.js";
import { generateCiYml } from "./templates/ci.yml.js";
import { generateReadme } from "./templates/readme.js";
import { generateLicense } from "./templates/license.js";
import { generateChangelog } from "./templates/changelog.js";

export interface ScaffoldOptions {
  name: string;
  dualPublish: boolean;
  react: boolean;
  monorepo: boolean;
  dir: string;
  author?: string;
  description?: string;
  license?: "MIT" | "Apache-2.0" | "ISC";
  git?: boolean;
  nodeVersion?: number;
}

export async function scaffold(options: ScaffoldOptions): Promise<void> {
  const root = join(options.dir, options.name);

  // Create directories
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "test"), { recursive: true });

  if (!options.monorepo) {
    await mkdir(join(root, ".github", "workflows"), { recursive: true });
  }

  // Write all files
  const files: Array<[string, string]> = [
    ["package.json", generatePackageJson(options)],
    ["tsconfig.json", generateTsconfig(options)],
    ["src/index.ts", generateIndexTs()],
    ["test/index.test.ts", generateTestTs(options)],
    [".gitignore", generateGitignore()],
    [".npmignore", generateNpmignore()],
    ["README.md", generateReadme(options)],
    ["CHANGELOG.md", generateChangelog()],
  ];

  if (!options.monorepo) {
    files.push(
      [".github/workflows/ci.yml", generateCiYml(options)],
      ["LICENSE", generateLicense(options)],
    );
  }

  const results = await Promise.allSettled(
    files.map(([path, content]) => writeFile(join(root, path), content)),
  );
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length > 0) {
    for (const f of failures) {
      logger.error(`Failed to write file: ${f.reason instanceof Error ? f.reason.message : String(f.reason)}`);
    }
    throw new Error(`${failures.length} file(s) failed to write during scaffold`);
  }

  // Git init (non-monorepo only, unless --no-git)
  if (!options.monorepo && options.git !== false) {
    try {
      execFileSync("git", ["init"], { cwd: root, stdio: "pipe" });
    } catch (err) {
      logger.verbose(`[scaffold] git not available, skipping init: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
