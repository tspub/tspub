import type { ScaffoldOptions } from "../index.js";

export function generateTsconfig(options: ScaffoldOptions): string {
  const compilerOptions: Record<string, unknown> = {
    target: "ES2022",
    module: "NodeNext",
    moduleResolution: "NodeNext",
    declaration: true,
    declarationMap: true,
    sourceMap: true,
    outDir: "dist",
    rootDir: "src",
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    isolatedModules: true,
    verbatimModuleSyntax: true,
    noUncheckedIndexedAccess: true,
  };

  if (options.react) {
    compilerOptions["jsx"] = "react-jsx";
  }

  if (options.monorepo) {
    compilerOptions["composite"] = true;
  }

  const tsconfig: Record<string, unknown> = {
    compilerOptions,
    include: ["src"],
    exclude: ["node_modules", "dist", "test"],
  };

  return JSON.stringify(tsconfig, null, 2) + "\n";
}
