/**
 * Example tspub plugin: no-barrel-files
 *
 * Warns if a package re-exports everything from a single file,
 * which can hurt tree-shaking in bundlers.
 *
 * Usage in tspub.config.ts:
 *   check: { plugins: ["./tspub-plugin-no-barrel.js"] }
 */

/** @type {import("tspub").Rule[]} */
export const rules = [
  {
    meta: {
      id: "custom/no-barrel-reexport",
      description: "Warn when main entry is just a barrel re-export",
      defaultSeverity: "warning",
      fixable: false,
      category: "custom",
    },
    check(ctx) {
      const main = ctx.pkg.main ?? ctx.pkg.exports?.["."]?.import?.default;
      if (!main) return [];

      const mainFile = ctx.distFiles.find((f) => f.endsWith(main) || `./${f}` === main);
      if (!mainFile) return [];

      // Read the file and check if it's just re-exports
      const content = ctx.readFile?.(mainFile);
      if (!content) return [];

      const lines = content.trim().split("\n").filter((l) => l.trim());
      const allReexports = lines.every(
        (l) => l.startsWith("export {") || l.startsWith("export *"),
      );

      if (allReexports && lines.length > 3) {
        return [
          {
            severity: "warning",
            message: `Main entry "${main}" is a barrel file with ${lines.length} re-exports. Consider using explicit exports in package.json instead for better tree-shaking.`,
          },
        ];
      }

      return [];
    },
  },
];
