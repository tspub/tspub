import { execFileSync } from "node:child_process";
import { join, basename, dirname, relative } from "node:path";
import { copyFile, readFile, writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import glob from "fast-glob";
import { logger } from "../shared/logger.js";
import { stripJsonComments } from "../shared/strip-json-comments.js";

interface TypeScriptWithIsolatedDecl {
  transpileDeclaration?: (
    content: string,
    opts: { compilerOptions: Record<string, unknown>; fileName: string },
  ) => { outputText: string; diagnostics: Array<{ category: number; messageText: string }> };
  DiagnosticCategory?: { Error: number };
}

export interface DtsOptions {
  dir: string;
  outDir: string;
  /** Package type field — determines which dual-format variants to emit */
  packageType?: "module" | "commonjs";
}

export async function generateDts(options: DtsOptions): Promise<void> {
  const { dir, outDir, packageType } = options;
  const outPath = join(dir, outDir);

  // Check if isolatedDeclarations fast-path is available
  const tsconfigPath = findTsconfig(dir);
  if (tsconfigPath && await tryIsolatedDeclarations(dir, tsconfigPath, outPath)) {
    logger.dim("  (used isolatedDeclarations fast path)");
  } else {
    // Standard tsc path
    const args = [
      "--emitDeclarationOnly",
      "--declaration",
      "--declarationDir", outPath,
      "--incremental",
      "--skipLibCheck",
    ];
    if (tsconfigPath) {
      args.push("--project", tsconfigPath);
    }

    const env = {
      ...process.env,
      PATH: `${join(dir, "node_modules", ".bin")}:${process.env["PATH"]}`,
    };

    logger.dim(`> tsc ${args.join(" ")}`);

    try {
      execFileSync("tsc", args, { cwd: dir, stdio: "pipe", env });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "stderr" in err) {
        const stderr = String((err as { stderr: unknown }).stderr).trim();
        const stdout = "stdout" in err ? String((err as { stdout: unknown }).stdout).trim() : "";
        const output = stderr || stdout;
        if (output) {
          logger.error(`tsc errors:\n${output}`);
        }
      }
      throw new Error("TypeScript declaration generation failed");
    }
  }

  // Generate dual-format type variants
  const dtsFiles = await glob("**/*.d.ts", { cwd: outPath, absolute: true });

  for (const file of dtsFiles) {
    const name = basename(file);
    if (name.endsWith(".d.cts") || name.endsWith(".d.mts")) continue;

    if (packageType === "module") {
      // ESM package: .d.ts is primary (ESM semantics).
      // Create .d.cts variant — rewrite top-level `export` to CJS-compatible form
      // if possible, otherwise copy as-is (TypeScript handles most cases).
      const ctsPath = file.replace(/\.d\.ts$/, ".d.cts");
      const content = await readFile(file, "utf-8");
      // Add an explicit marker comment so tooling knows this was auto-generated
      await writeFile(ctsPath, `// Auto-generated CJS declaration from ${basename(file)}\n${content}`);
    } else if (packageType === "commonjs") {
      // CJS package: .d.ts is primary (CJS semantics).
      // Create .d.mts variant with marker comment.
      const mtsPath = file.replace(/\.d\.ts$/, ".d.mts");
      const content = await readFile(file, "utf-8");
      await writeFile(mtsPath, `// Auto-generated ESM declaration from ${basename(file)}\n${content}`);
    }
  }
}

function findTsconfig(dir: string): string | null {
  for (const name of ["tsconfig.build.json", "tsconfig.json"]) {
    try {
      readFileSync(join(dir, name));
      return join(dir, name);
    } catch (err) {
      logger.verbose(`[dts] tsconfig "${name}" not found: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return null;
}

/**
 * Fast-path DTS generation using TypeScript's isolatedDeclarations mode.
 * Available since TS 5.5. Generates .d.ts per-file without full type-checking,
 * which is dramatically faster for large projects.
 *
 * Returns true if the fast path was used, false to fall back to standard tsc.
 */
async function tryIsolatedDeclarations(
  dir: string,
  tsconfigPath: string,
  outPath: string,
): Promise<boolean> {
  try {
    // Read tsconfig to check if isolatedDeclarations is enabled
    const raw = readFileSync(tsconfigPath, "utf-8");
    const tsconfig = JSON.parse(stripJsonComments(raw)) as {
      compilerOptions?: Record<string, unknown>;
    };

    if (!tsconfig.compilerOptions?.["isolatedDeclarations"]) {
      return false;
    }

    const ts = await import("typescript");

    // Check if ts.transpileDeclaration exists (TS 5.5+)
    if (typeof (ts as TypeScriptWithIsolatedDecl).transpileDeclaration !== "function") {
      return false;
    }

    logger.dim("> isolatedDeclarations (fast path)");

    // Determine source root from tsconfig
    const rootDir = (tsconfig.compilerOptions?.["rootDir"] as string) ?? "src";
    const srcDir = join(dir, rootDir);

    // Find all .ts/.tsx source files
    const sourceFiles = await glob("**/*.{ts,tsx}", {
      cwd: srcDir,
      absolute: true,
      ignore: ["**/*.d.ts", "**/node_modules/**"],
    });

    if (sourceFiles.length === 0) return false;

    const compilerOptions: Record<string, unknown> = {
      ...tsconfig.compilerOptions,
      declaration: true,
      emitDeclarationOnly: true,
      isolatedDeclarations: true,
    };

    // Read all source files in parallel
    const fileContents = await Promise.all(
      sourceFiles.map(async (f) => ({ path: f, content: await readFile(f, "utf-8") })),
    );

    let emitted = 0;
    for (const { path: sourceFile, content } of fileContents) {
      const relPath = relative(srcDir, sourceFile);
      const outFile = join(outPath, relPath.replace(/\.tsx?$/, ".d.ts"));

      try {
        const result = (ts as TypeScriptWithIsolatedDecl).transpileDeclaration!(content, {
          compilerOptions,
          fileName: sourceFile,
        });

        if (result.diagnostics && result.diagnostics.length > 0) {
          // If any file fails, fall back to standard tsc
          const errors = result.diagnostics.filter(
            (d) => d.category === (ts as TypeScriptWithIsolatedDecl).DiagnosticCategory?.Error,
          );
          if (errors.length > 0) {
            logger.dim("  isolatedDeclarations: falling back to tsc (diagnostic errors)");
            return false;
          }
        }

        await mkdir(dirname(outFile), { recursive: true });
        await writeFile(outFile, result.outputText);
        emitted++;
      } catch (err) {
        logger.verbose(`[dts] transpileDeclaration failed for ${sourceFile}: ${err instanceof Error ? err.message : String(err)}`);
        return false;
      }
    }

    logger.dim(`  emitted ${emitted} declaration file(s)`);
    return emitted > 0;
  } catch (err) {
    logger.verbose(`[dts] isolatedDeclarations fast-path failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}
