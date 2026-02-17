import { readFileSync } from "node:fs";

function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*/g, "");
}

const ESM_RE =
  /([\s;]|^)(import[\w,{}\s*]*from|import\s*['"{*]|export\b\s*(?:[*{]|default|type|function|const|var|let|async)|import\.meta\b)/m;

const CJS_RE =
  /([\s;]|^)(module\.exports\b|exports\.\w|require\s*\(|Object\.(defineProperty|defineProperties|assign)\s*\(\s*exports\b)/m;

export function hasESMSyntax(content: string): boolean {
  return ESM_RE.test(stripComments(content));
}

export function hasCJSSyntax(content: string): boolean {
  return CJS_RE.test(stripComments(content));
}

export function getExpectedFormat(
  filePath: string,
  pkgType?: string,
): "esm" | "cjs" {
  if (filePath.endsWith(".mjs") || filePath.endsWith(".mts")) return "esm";
  if (filePath.endsWith(".cjs") || filePath.endsWith(".cts")) return "cjs";
  return pkgType === "module" ? "esm" : "cjs";
}

export function getCodeFormat(
  content: string,
): "esm" | "cjs" | "mixed" | "unknown" {
  const esm = hasESMSyntax(content);
  const cjs = hasCJSSyntax(content);
  if (esm && cjs) return "mixed";
  if (esm) return "esm";
  if (cjs) return "cjs";
  return "unknown";
}

export function hasShebang(content: string): boolean {
  return content.startsWith("#!");
}

export function readFileSafe(filePath: string): string | null {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}
