import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { relative } from "node:path";
import { logger } from "../shared/logger.js";
import type { OutputFile } from "./plugins.js";

export interface FileSizeInfo {
  name: string;
  path: string;
  raw: number;
  gzip: number;
}

export function computeSizes(files: OutputFile[], baseDir?: string): FileSizeInfo[] {
  const rows: FileSizeInfo[] = [];
  for (const file of files) {
    try {
      const content = readFileSync(file.path);
      rows.push({
        name: baseDir ? relative(baseDir, file.path) : file.path,
        path: file.path,
        raw: content.length,
        gzip: gzipSync(content).length,
      });
    } catch {
      // skip files that can't be read
    }
  }
  return rows;
}

export function reportSizes(files: OutputFile[], baseDir?: string): FileSizeInfo[] {
  const rows = computeSizes(files, baseDir);
  if (rows.length === 0) return rows;

  logger.info("Build output:");
  for (const row of rows) {
    logger.dim(`  ${row.name}  ${formatSize(row.raw)} │ gzip: ${formatSize(row.gzip)}`);
  }
  return rows;
}

export function checkSizeLimits(
  sizeInfos: FileSizeInfo[],
  limits: Record<string, string>,
): string[] {
  const errors: string[] = [];

  for (const [pattern, limitStr] of Object.entries(limits)) {
    const limitBytes = parseSize(limitStr);
    if (limitBytes === null) {
      errors.push(`Invalid size limit "${limitStr}" for pattern "${pattern}"`);
      continue;
    }

    for (const info of sizeInfos) {
      if (!matchPattern(info.name, pattern)) continue;
      if (info.gzip > limitBytes) {
        errors.push(
          `${info.name} gzip size ${formatSize(info.gzip)} exceeds limit ${limitStr}`,
        );
      }
    }
  }

  return errors;
}

function parseSize(str: string): number | null {
  const match = str.match(/^(\d+(?:\.\d+)?)\s*(B|kB|KB|MB|GB)$/i);
  if (!match) return null;
  const num = parseFloat(match[1]!);
  const unit = match[2]!.toLowerCase();
  if (unit === "b") return num;
  if (unit === "kb") return num * 1024;
  if (unit === "mb") return num * 1024 * 1024;
  if (unit === "gb") return num * 1024 * 1024 * 1024;
  return null;
}

function matchPattern(name: string, pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern.startsWith("*.")) {
    return name.endsWith(pattern.slice(1));
  }
  return name.includes(pattern);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
