import type { Command } from "commander";
import { runTypeTests } from "../type-tester/index.js";
import { logger } from "../shared/logger.js";

interface TestTypesActionOptions {
  dir: string;
}

export function registerTestTypes(program: Command): void {
  program
    .command("test-types")
    .description("Run type declaration tests (.test-d.ts files)")
    .option("--dir <directory>", "Directory containing .test-d.ts files", "test-d")
    .action(async (options: TestTypesActionOptions) => {
      const dir = process.cwd();
      logger.heading("tspub test-types");

      try {
        const result = await runTypeTests({
          dir,
          directory: options.dir,
        });

        if (result.fileCount === 0) {
          logger.info("No .test-d.ts files found");
          return;
        }

        logger.info(`Found ${result.fileCount} type test file(s)`);

        if (result.passed) {
          logger.success("All type tests passed!");
        } else {
          for (const err of result.errors) {
            logger.error(`${err.file}:${err.line} — ${err.message}`);
          }
          logger.error(`${result.errors.length} type error(s) found`);
          process.exitCode = 1;
        }
      } catch (err) {
        logger.error(
          `Type test failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    });
}
