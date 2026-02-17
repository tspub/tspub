import { gunzipSync } from "fflate";

export interface TarballResult {
  files: Map<string, string>;
  version: string;
  pkg: Record<string, unknown>;
}

export async function fetchAndUnpack(
  name: string,
  version?: string,
): Promise<TarballResult> {
  // Scoped packages like @types/node need the scope's / kept literal
  const encodedName = name.startsWith("@")
    ? "@" + name.slice(1).split("/").map(encodeURIComponent).join("/")
    : encodeURIComponent(name);

  const metaUrl = version
    ? `https://registry.npmjs.org/${encodedName}/${encodeURIComponent(version)}`
    : `https://registry.npmjs.org/${encodedName}/latest`;

  const metaRes = await fetch(metaUrl);
  if (!metaRes.ok) {
    throw new Error(
      metaRes.status === 404
        ? `Package "${name}" not found`
        : `Registry error: ${metaRes.status}`,
    );
  }
  const meta = (await metaRes.json()) as {
    version: string;
    dist: { tarball: string };
  };
  const tarballUrl = meta.dist.tarball;
  const resolvedVersion = meta.version;

  const tarRes = await fetch(tarballUrl);
  if (!tarRes.ok) {
    throw new Error(`Failed to fetch tarball: ${tarRes.status}`);
  }
  const compressed = new Uint8Array(await tarRes.arrayBuffer());
  const decompressed = gunzipSync(compressed);

  const files = parseTar(decompressed);
  const pkgJson = files.get("package.json");
  if (!pkgJson) {
    throw new Error("Tarball missing package.json");
  }

  return {
    files,
    version: resolvedVersion,
    pkg: JSON.parse(pkgJson) as Record<string, unknown>,
  };
}

function parseTar(data: Uint8Array): Map<string, string> {
  const files = new Map<string, string>();
  const decoder = new TextDecoder();
  let offset = 0;

  while (offset < data.length - 512) {
    const header = data.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;

    // Tar header: name at 0 (100 bytes), size at 124 (12 bytes, octal)
    // Type flag at byte 156: '0' or '\0' = regular file, '5' = directory
    const rawName = decoder.decode(header.subarray(0, 100)).replace(/\0/g, "");
    const sizeStr = decoder
      .decode(header.subarray(124, 136))
      .replace(/\0/g, "")
      .trim();
    const size = parseInt(sizeStr, 8) || 0;

    // Check for UStar extended prefix at offset 345 (155 bytes)
    const prefix = decoder
      .decode(header.subarray(345, 500))
      .replace(/\0/g, "");
    const fullName = prefix ? `${prefix}/${rawName}` : rawName;

    const typeFlag = header[156];
    offset += 512;

    if (typeFlag !== 53 /* '5' = dir */ && !fullName.endsWith("/")) {
      // Strip leading directory from npm tarballs (usually "package/"
      // but scoped packages like @types/node may use the bare name)
      const cleanName = fullName.replace(/^[^/]+\//, "");
      if (isTextFile(cleanName) && size < 2_000_000) {
        files.set(
          cleanName,
          size > 0
            ? decoder.decode(data.subarray(offset, offset + size))
            : "",
        );
      }
    }
    offset += Math.ceil(size / 512) * 512;
  }

  return files;
}

function isTextFile(name: string): boolean {
  return (
    /\.(json|js|mjs|cjs|ts|mts|cts|d\.ts|d\.mts|d\.cts|md|txt|yml|yaml|map)$/.test(
      name,
    ) ||
    /^licen[sc]e(\.md|\.txt)?$/i.test(name) ||
    name === "README" ||
    name === "README.md" ||
    name === ".npmignore"
  );
}
