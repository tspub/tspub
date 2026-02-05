import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { readFileSync, writeFileSync } from "node:fs";
import { fileExists } from "../../shared/resolve.js";
import { stripJsonComments } from "../../shared/strip-json-comments.js";
import type { DoctorRule } from "../framework/types.js";

export const tsconfigExistsRule: DoctorRule = {
  meta: {
    id: "typescript/tsconfig-exists",
    description: "Check that tsconfig.json exists",
    defaultSeverity: "error",
    fixable: "safe",
    category: "typescript",
  },
  async check(ctx) {
    if (!(await fileExists(join(ctx.dir, "tsconfig.json")))) {
      return [
        {
          severity: "error",
          message: "No tsconfig.json found. TypeScript projects need a tsconfig.json.",
        },
      ];
    }
    return [];
  },
  async fix(ctx) {
    const tsconfig = {
      compilerOptions: {
        target: "ES2022",
        module: "Node16",
        moduleResolution: "Node16",
        declaration: true,
        strict: true,
        esModuleInterop: true,
        outDir: "dist",
        rootDir: "src",
      },
      include: ["src"],
    };
    await writeFile(
      join(ctx.dir, "tsconfig.json"),
      JSON.stringify(tsconfig, null, 2) + "\n",
    );
    return { message: "Created default tsconfig.json", pkgModified: false };
  },
};

export const tsconfigStrictRule: DoctorRule = {
  meta: {
    id: "typescript/strict",
    description: "Recommend strict mode",
    defaultSeverity: "warning",
    fixable: "safe",
    category: "typescript",
  },
  check(ctx) {
    if (!ctx.compilerOptions) return [];
    if (ctx.compilerOptions["strict"] !== true) {
      return [
        {
          severity: "warning",
          message: 'tsconfig.json: "strict" is not enabled. Enable strict mode for safer types.',
        },
      ];
    }
    return [];
  },
  fix(ctx) {
    return setTsconfigOption(ctx.dir, "strict", true);
  },
};

export const tsconfigDeclarationRule: DoctorRule = {
  meta: {
    id: "typescript/declaration",
    description: "Ensure declaration generation is enabled",
    defaultSeverity: "warning",
    fixable: "safe",
    category: "typescript",
  },
  check(ctx) {
    if (!ctx.compilerOptions) return [];
    if (ctx.compilerOptions["declaration"] !== true) {
      return [
        {
          severity: "warning",
          message: 'tsconfig.json: "declaration" is not enabled. Libraries need .d.ts files.',
        },
      ];
    }
    return [];
  },
  fix(ctx) {
    return setTsconfigOption(ctx.dir, "declaration", true);
  },
};

export const tsconfigModuleRule: DoctorRule = {
  meta: {
    id: "typescript/module",
    description: "Check module setting is appropriate",
    defaultSeverity: "info",
    fixable: false,
    category: "typescript",
  },
  check(ctx) {
    if (!ctx.compilerOptions) return [];
    const mod = ctx.compilerOptions["module"];
    if (mod === undefined) {
      return [
        {
          severity: "info",
          message: 'tsconfig.json: No "module" specified. Consider Node16, NodeNext, or ESNext.',
        },
      ];
    }
    return [];
  },
};

export const tsconfigModuleResolutionRule: DoctorRule = {
  meta: {
    id: "typescript/module-resolution",
    description: "Check moduleResolution setting",
    defaultSeverity: "info",
    fixable: false,
    category: "typescript",
  },
  check(ctx) {
    if (!ctx.compilerOptions) return [];
    const mr = ctx.compilerOptions["moduleResolution"];
    if (mr === undefined) {
      return [
        {
          severity: "info",
          message: 'tsconfig.json: No "moduleResolution" specified. Consider Node16, NodeNext, or Bundler.',
        },
      ];
    }
    const mrStr = String(mr).toLowerCase();
    if (mrStr === "node" || mrStr === "classic") {
      return [
        {
          severity: "warning",
          message: `tsconfig.json: moduleResolution "${mr}" is legacy. Use Node16, NodeNext, or Bundler.`,
        },
      ];
    }
    return [];
  },
};

function setTsconfigOption(
  dir: string,
  key: string,
  value: unknown,
): { message: string; pkgModified: boolean } {
  const tsconfigPath = join(dir, "tsconfig.json");
  try {
    const raw = readFileSync(tsconfigPath, "utf-8");
    const parsed = JSON.parse(stripJsonComments(raw)) as Record<string, unknown>;
    if (!parsed.compilerOptions || typeof parsed.compilerOptions !== "object") {
      parsed.compilerOptions = {};
    }
    (parsed.compilerOptions as Record<string, unknown>)[key] = value;
    writeFileSync(tsconfigPath, JSON.stringify(parsed, null, 2) + "\n");
    return {
      message: `Set compilerOptions.${key} = ${JSON.stringify(value)} in tsconfig.json`,
      pkgModified: false,
    };
  } catch {
    return { message: "", pkgModified: false };
  }
}

export const typescriptRules: DoctorRule[] = [
  tsconfigExistsRule,
  tsconfigStrictRule,
  tsconfigDeclarationRule,
  tsconfigModuleRule,
  tsconfigModuleResolutionRule,
];
