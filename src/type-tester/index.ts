import { join } from "node:path";
import { readdir, writeFile, rm, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileExists } from "../shared/resolve.js";

export interface TypeTestResult {
  passed: boolean;
  fileCount: number;
  errors: TypeTestError[];
}

export interface TypeTestError {
  file: string;
  line: number;
  message: string;
}

export interface TypeTestOptions {
  dir: string;
  directory?: string;
}

export async function runTypeTests(options: TypeTestOptions): Promise<TypeTestResult> {
  const { dir, directory = "test-d" } = options;

  // Discover .test-d.ts / .test-d.tsx files
  const testDir = join(dir, directory);
  const testFiles: string[] = [];

  if (await fileExists(testDir)) {
    const files = await readdir(testDir, { recursive: true });
    for (const f of files) {
      const name = typeof f === "string" ? f : "";
      if (name.endsWith(".test-d.ts") || name.endsWith(".test-d.tsx")) {
        testFiles.push(join(directory, name));
      }
    }
  }

  // Also check project root for .test-d.ts files
  try {
    const rootFiles = await readdir(dir);
    for (const f of rootFiles) {
      const name = typeof f === "string" ? f : "";
      if (name.endsWith(".test-d.ts") || name.endsWith(".test-d.tsx")) {
        testFiles.push(name);
      }
    }
  } catch {
    // ignore
  }

  if (testFiles.length === 0) {
    return { passed: true, fileCount: 0, errors: [] };
  }

  // Create a temporary tsconfig that extends the project's
  const tmpDir = join(dir, "node_modules", ".tspub-type-test");
  await mkdir(tmpDir, { recursive: true });

  const tmpTsconfig = join(tmpDir, "tsconfig.json");

  // Find the project's actual tsconfig
  let tsconfigExtends = "../../tsconfig.json";
  for (const candidate of ["tsconfig.build.json", "tsconfig.json"]) {
    if (await fileExists(join(dir, candidate))) {
      tsconfigExtends = `../../${candidate}`;
      break;
    }
  }

  const tsconfigContent = {
    extends: tsconfigExtends,
    include: testFiles.map((f) => join("../../", f)),
    compilerOptions: {
      noEmit: true,
    },
  };

  await writeFile(tmpTsconfig, JSON.stringify(tsconfigContent, null, 2));

  // Run tsc --noEmit via node_modules/.bin PATH (avoids npx shell-like behavior)
  const env = {
    ...process.env,
    PATH: `${join(dir, "node_modules", ".bin")}:${process.env["PATH"]}`,
  };
  const errors: TypeTestError[] = [];
  try {
    execFileSync("tsc", ["--noEmit", "--project", tmpTsconfig], {
      cwd: dir,
      encoding: "utf-8",
      stdio: "pipe",
      env,
    });
  } catch (err) {
    // tsc exits non-zero when there are errors
    const output = (err as { stdout?: string; stderr?: string }).stdout ?? "";
    const stderr = (err as { stdout?: string; stderr?: string }).stderr ?? "";
    const combined = output + "\n" + stderr;

    // Parse tsc output: file(line,col): error TSxxxx: message
    const lines = combined.split("\n");
    for (const line of lines) {
      const match = line.match(/^(.+)\((\d+),\d+\):\s*error\s+TS\d+:\s*(.+)$/);
      if (match) {
        errors.push({
          file: match[1]!,
          line: Number(match[2]),
          message: match[3]!.trim(),
        });
      }
    }

    // Check for unused @ts-expect-error — these show as errors too
    // tsc reports them as "Unused '@ts-expect-error' directive"
    // These are actually failures in our case (the expected error didn't occur)
  }

  // Cleanup
  try {
    await rm(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup failure
  }

  return {
    passed: errors.length === 0,
    fileCount: testFiles.length,
    errors,
  };
}
