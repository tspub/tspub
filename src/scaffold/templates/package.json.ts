import type { ScaffoldOptions } from "../index.js";

export function generatePackageJson(options: ScaffoldOptions): string {
  const { name, dualPublish, react, monorepo } = options;

  const exports: Record<string, unknown> = dualPublish
    ? {
        ".": {
          import: {
            types: "./dist/index.d.ts",
            default: "./dist/index.js",
          },
          require: {
            types: "./dist/index.d.cts",
            default: "./dist/index.cjs",
          },
        },
      }
    : {
        ".": {
          import: {
            types: "./dist/index.d.ts",
            default: "./dist/index.js",
          },
        },
      };

  const scripts: Record<string, string> = {
    build: dualPublish ? "tspub build --format esm,cjs" : "tspub build",
    check: "tspub check",
    test: "vitest",
    prepublishOnly: "tspub build && tspub check",
  };

  const devDependencies: Record<string, string> = {
    tspub: "^0.1.0",
    typescript: "^5.7.0",
    vitest: "^3.0.0",
  };

  const pkg: Record<string, unknown> = {
    name: monorepo ? `@monorepo/${name}` : name,
    version: "0.1.0",
    description: options.description ?? "",
    type: "module",
    exports,
    files: ["dist"],
    scripts,
    author: options.author ?? "",
    license: options.license ?? "MIT",
    devDependencies,
  };

  if (monorepo) {
    pkg["publishConfig"] = { access: "public" };
  }

  if (react) {
    pkg["peerDependencies"] = {
      react: "^18.0.0 || ^19.0.0",
      "@types/react": "^18.0.0 || ^19.0.0",
    };
  }

  return JSON.stringify(pkg, null, 2) + "\n";
}
