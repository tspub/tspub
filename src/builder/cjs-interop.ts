import type { Plugin } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";

const CJS_INTEROP_FOOTER = [
  "",
  "// CJS interop: make default export available as module.exports",
  "if (module.exports && module.exports.__esModule && module.exports.default) {",
  "  var _default = module.exports.default;",
  "  Object.defineProperty(_default, '__esModule', { value: true });",
  "  Object.keys(module.exports).forEach(function(key) {",
  "    if (key !== 'default' && key !== '__esModule') {",
  "      Object.defineProperty(_default, key, { enumerable: true, get: function() { return module.exports[key]; } });",
  "    }",
  "  });",
  "  module.exports = _default;",
  "}",
].join("\n");

/**
 * Detect if output has a default export using esbuild's metafile exports list.
 * Falls back to regex matching if metafile info is unavailable.
 */
function hasDefaultExportInMeta(exports: string[]): boolean {
  return exports.includes("default");
}

/**
 * Legacy regex-based detection as fallback.
 */
function hasDefaultExportRegex(code: string): boolean {
  return /default:\s*\(\)\s*=>/.test(code) || code.includes("exports.default");
}

export function cjsInteropPlugin(): Plugin {
  return {
    name: "tspub-cjs-interop",
    setup(build) {
      build.onEnd(async (result) => {
        if (!result.outputFiles && result.errors.length === 0) {
          const meta = result.metafile;
          if (!meta) return;

          for (const [outFile, outputInfo] of Object.entries(meta.outputs)) {
            if (!outFile.endsWith(".cjs") && !outFile.endsWith(".js")) continue;

            // Prefer metafile exports for detection
            const metaExports = outputInfo.exports ?? [];
            const content = await readFile(outFile, "utf-8");
            const needsInterop = metaExports.length > 0
              ? hasDefaultExportInMeta(metaExports)
              : hasDefaultExportRegex(content);

            if (needsInterop) {
              await writeFile(outFile, content + CJS_INTEROP_FOOTER);
            }
          }
        }
      });
    },
  };
}
