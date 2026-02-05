import chalk from "chalk";

export type LogLevel = "normal" | "verbose" | "silent";

let level: LogLevel = "normal";

export const logger = {
  setLevel(newLevel: LogLevel) {
    level = newLevel;
  },
  getLevel(): LogLevel {
    return level;
  },
  info(msg: string) {
    if (level === "silent") return;
    console.log(chalk.blue("ℹ"), msg);
  },
  success(msg: string) {
    if (level === "silent") return;
    console.log(chalk.green("✓"), msg);
  },
  warn(msg: string) {
    if (level === "silent") return;
    console.log(chalk.yellow("⚠"), chalk.yellow("WARNING"), msg);
  },
  error(msg: string) {
    if (level === "silent") return;
    console.log(chalk.red("✗"), chalk.red("ERROR"), msg);
  },
  ok(msg: string) {
    if (level === "silent") return;
    console.log(chalk.green("✓"), chalk.green("OK"), msg);
  },
  heading(msg: string) {
    if (level === "silent") return;
    console.log();
    console.log(chalk.bold(msg));
    console.log();
  },
  dim(msg: string) {
    if (level === "silent") return;
    console.log(chalk.dim(msg));
  },
  verbose(msg: string) {
    if (level !== "verbose") return;
    console.log(chalk.gray("[verbose]"), msg);
  },
};
