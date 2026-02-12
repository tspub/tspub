import type { Command } from "commander";
import { logger } from "../shared/logger.js";
import { writeChangeset } from "../changeset/writer.js";
import { consumeChangesets } from "../changeset/version.js";
import { createSnapshot } from "../changeset/snapshot.js";
import { parseChangeset } from "../changeset/parser.js";
import { loadConfig } from "../config/loader.js";
import { readdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { isMonorepoRoot, discoverWorkspaces } from "../workspace/index.js";
import { readPackageJson } from "../shared/package-json.js";
import type { BumpType } from "../changeset/types.js";

export function registerChangeset(program: Command): void {
  const cmd = program
    .command("changeset")
    .description("Manage changesets for versioning");

  // Default action (same as add)
  cmd.action(async () => { await addChangeset(); });

  cmd.command("add").description("Create a new changeset").action(async () => { await addChangeset(); });

  cmd.command("version")
    .description("Consume changesets and update versions")
    .option("--dry-run", "Preview without making changes")
    .action(async (options: { dryRun?: boolean }) => {
      const dir = process.cwd();
      logger.heading("tspub changeset version");

      if (options.dryRun) {
        // Just show what would happen
        const changesetDir = join(dir, ".changeset");
        try {
          const files = (await readdir(changesetDir)).filter(f => f.endsWith(".md") && f !== "README.md");
          if (files.length === 0) {
            logger.info("No pending changesets");
            return;
          }
          const bumps = new Map<string, BumpType>();
          for (const file of files) {
            const cs = await parseChangeset(join(changesetDir, file));
            for (const entry of cs.entries) {
              const current = bumps.get(entry.packageName);
              if (!current || bumpRank(entry.bump) > bumpRank(current)) {
                bumps.set(entry.packageName, entry.bump);
              }
            }
          }
          for (const [name, bump] of bumps) {
            logger.info(`${name}: ${bump}`);
          }
        } catch {
          logger.info("No .changeset directory found");
        }
        return;
      }

      let packageDirs: Map<string, string> | undefined;
      if (await isMonorepoRoot(dir)) {
        const workspaces = await discoverWorkspaces(dir);
        packageDirs = new Map(workspaces.map(w => [w.name, w.dir]));
      }

      const config = await loadConfig(dir);
      const csConfig = config?.changeset;

      const { updates, cleanup } = await consumeChangesets(dir, packageDirs, {
        dependentBumping: csConfig?.dependentBumping,
        linked: csConfig?.linked,
        fixed: csConfig?.fixed,
      });
      if (updates.length === 0) {
        logger.info("No changesets to consume");
        return;
      }
      for (const u of updates) {
        logger.success(`${u.packageName}: ${u.oldVersion} → ${u.newVersion} (${u.bump})`);
      }
      await cleanup();
    });

  cmd.command("status")
    .description("Show pending changesets")
    .action(async () => {
      const dir = process.cwd();
      const changesetDir = join(dir, ".changeset");
      try {
        const files = (await readdir(changesetDir)).filter(f => f.endsWith(".md") && f !== "README.md");
        if (files.length === 0) {
          logger.info("No pending changesets");
          return;
        }
        logger.heading("Pending changesets");
        for (const file of files) {
          const cs = await parseChangeset(join(changesetDir, file));
          const pkgs = cs.entries.map(e => `${e.packageName}:${e.bump}`).join(", ");
          logger.info(`${basename(file, ".md")}: ${pkgs} — ${cs.summary.slice(0, 60)}`);
        }
      } catch {
        logger.info("No .changeset directory found");
      }
    });

  cmd.command("snapshot")
    .description("Publish snapshot versions")
    .option("--tag <tag>", "Snapshot tag", "snapshot")
    .action(async (options: { tag: string }) => {
      const dir = process.cwd();
      logger.heading("tspub changeset snapshot");
      const versions = await createSnapshot(dir, options.tag);
      if (versions.length === 0) {
        logger.info("No changesets found for snapshot");
        return;
      }
      for (const v of versions) {
        logger.success(`Snapshot: ${v}`);
      }
    });
}

function bumpRank(bump: BumpType): number {
  switch (bump) { case "major": return 3; case "minor": return 2; case "patch": return 1; }
}

async function addChangeset(): Promise<void> {
  const dir = process.cwd();
  logger.heading("tspub changeset add");

  let packageName: string;
  const prompts = (await import("prompts")).default;

  if (await isMonorepoRoot(dir)) {
    const workspaces = await discoverWorkspaces(dir);
    const { selected } = await prompts({
      type: "multiselect",
      name: "selected",
      message: "Select packages",
      choices: workspaces.map(w => ({ title: w.name, value: w.name })),
    });
    if (!selected || selected.length === 0) {
      logger.info("No packages selected");
      return;
    }

    const { bump } = await prompts({
      type: "select",
      name: "bump",
      message: "Bump type",
      choices: [
        { title: "patch", value: "patch" },
        { title: "minor", value: "minor" },
        { title: "major", value: "major" },
      ],
    });

    const { summary } = await prompts({
      type: "text",
      name: "summary",
      message: "Summary",
    });

    if (!summary) { logger.info("Cancelled"); return; }

    const entries = (selected as string[]).map(name => ({ packageName: name, bump: bump as BumpType }));
    const filePath = await writeChangeset(dir, entries, summary);
    logger.success(`Created changeset: ${filePath}`);
  } else {
    const pkg = await readPackageJson(dir);
    packageName = pkg.name ?? basename(dir);

    const { bump } = await prompts({
      type: "select",
      name: "bump",
      message: "Bump type",
      choices: [
        { title: "patch", value: "patch" },
        { title: "minor", value: "minor" },
        { title: "major", value: "major" },
      ],
    });

    const { summary } = await prompts({
      type: "text",
      name: "summary",
      message: "Summary",
    });

    if (!summary) { logger.info("Cancelled"); return; }

    const filePath = await writeChangeset(dir, [{ packageName, bump: bump as BumpType }], summary);
    logger.success(`Created changeset: ${filePath}`);
  }
}
