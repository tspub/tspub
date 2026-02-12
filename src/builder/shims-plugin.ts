import type { Plugin } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";

const CJS_SHIMS_BANNER =
  "var __tspub_import_meta_url = require('url').pathToFileURL(__filename).href;";

export function shimsPlugin(): Plugin {
  return {
    name: "tspub-shims",
    setup(build) {
      build.onEnd(async (result) => {
        if (!result.metafile || result.errors.length > 0) return;

        for (const outFile of Object.keys(result.metafile.outputs)) {
          if (!outFile.endsWith(".cjs") && !outFile.endsWith(".js")) continue;

          const content = await readFile(outFile, "utf-8");
          const needsShims =
            content.includes("import.meta.url") ||
            content.includes("import.meta.dirname") ||
            content.includes("import.meta.filename");

          if (needsShims) {
            let shimmed = CJS_SHIMS_BANNER + "\n" + content;
            shimmed = shimmed
              .replace(/import\.meta\.url/g, "__tspub_import_meta_url")
              .replace(/import\.meta\.dirname/g, "__dirname")
              .replace(/import\.meta\.filename/g, "__filename");
            await writeFile(outFile, shimmed);
          }
        }
      });
    },
  };
}
