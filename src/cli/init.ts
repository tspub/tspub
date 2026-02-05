import type { Command } from "commander";
import { scaffold } from "../scaffold/index.js";
import { promptInit } from "../scaffold/prompts.js";
import { logger } from "../shared/logger.js";

interface InitActionOptions {
  esmOnly?: boolean;
  cjs?: boolean;
  monorepo?: boolean;
  react?: boolean;
  author?: string;
  description?: string;
  license?: "MIT" | "Apache-2.0" | "ISC";
  git: boolean;
}

export function registerInit(program: Command): void {
  program
    .command("init [name]")
    .description("Scaffold a new TypeScript package")
    .option("--esm-only", "Skip CJS output (recommended for new packages)", true)
    .option("--cjs", "Include CJS output (dual publishing)")
    .option("--monorepo", "Init inside an existing monorepo")
    .option("--react", "Add JSX support + react peer dep")
    .option("--author <name>", "Author name")
    .option("--description <desc>", "Package description")
    .option("--license <license>", "License (MIT, Apache-2.0, ISC)")
    .option("--no-git", "Skip git init")
    .action(async (name: string | undefined, options: InitActionOptions) => {
      let packageName = name ?? "my-package";
      let dualPublish = options.cjs === true;
      let react = options.react === true;
      let { author, description, license } = options;
      const monorepo = options.monorepo === true;

      // Interactive mode: no name arg and TTY
      if (!name && process.stdin.isTTY) {
        try {
          const answers = await promptInit();
          packageName = answers.name;
          dualPublish = answers.dualPublish;
          react = answers.react;
          author = answers.author || author;
          description = answers.description || description;
          license = answers.license || license;
        } catch {
          // User cancelled, fall through with defaults
        }
      }

      logger.heading(`tspub init — creating ${packageName}`);

      try {
        await scaffold({
          name: packageName,
          dualPublish,
          react,
          monorepo,
          dir: process.cwd(),
          author,
          description,
          license,
          git: options.git,
        });
        logger.success(`Package ${packageName} created successfully!`);
        console.log();
        console.log(`  cd ${packageName}`);
        console.log("  npm install");
        console.log("  npm run build");
        console.log();
      } catch (err) {
        logger.error(
          `Failed to create package: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    });
}
