import { Command } from "commander";
import { createRequire } from "node:module";
import { registerInit } from "./init.js";
import { registerBuild } from "./build.js";
import { registerCheck } from "./check.js";
import { registerPublish } from "./publish.js";
import { registerDoctor } from "./doctor.js";
import { registerScan } from "./scan.js";
import { registerTestTypes } from "./test-types.js";
import { registerChangeset } from "./changeset.js";
import { logger } from "../shared/logger.js";

function getVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("../../package.json") as { version: string };
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name("tspub")
    .description(
      "The unified TypeScript package toolkit — init, build, check, publish in one tool",
    )
    .version(getVersion())
    .option("--verbose", "Enable verbose logging")
    .option("--silent", "Suppress all output except errors")
    .hook("preAction", (_thisCommand, actionCommand) => {
      const opts = actionCommand.optsWithGlobals();
      if (opts["verbose"]) {
        logger.setLevel("verbose");
      } else if (opts["silent"]) {
        logger.setLevel("silent");
      }
    });

  registerInit(program);
  registerBuild(program);
  registerCheck(program);
  registerPublish(program);
  registerDoctor(program);
  registerScan(program);
  registerTestTypes(program);
  registerChangeset(program);

  program
    .command("pack")
    .description("Preview what gets published")
    .action(async () => {
      try {
        const { execFileSync } = await import("node:child_process");
        console.log(execFileSync("npm", ["pack", "--dry-run"], { encoding: "utf-8" }));
      } catch (err) {
        logger.error(`Pack failed: ${err instanceof Error ? err.message : String(err)}`);
        process.exitCode = 1;
      }
    });

  return program;
}

export function run(argv: string[]): void {
  const program = createProgram();
  program.parse(argv);
}
