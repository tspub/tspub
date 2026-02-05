const CONDITION_KEYS = [
  "types",
  "import",
  "require",
  "default",
  "module",
  "node",
  "browser",
];

export function isSugarForm(exports: Record<string, unknown>): boolean {
  const keys = Object.keys(exports);
  return (
    !keys.some((k) => k.startsWith("./")) &&
    keys.some((k) => CONDITION_KEYS.includes(k))
  );
}

export function getMainExport(
  exports: Record<string, unknown>,
): Record<string, unknown> | null {
  const dot = exports["."];
  if (typeof dot === "object" && dot !== null) {
    return dot as Record<string, unknown>;
  }
  if (isSugarForm(exports)) {
    return exports;
  }
  return null;
}

export interface ExportEntry {
  subpath: string;
  condition: string;
  value: string;
  conditionKeys: string[];
  isFallbackArray?: boolean;
}

export function walkExports(
  exports: Record<string, unknown> | string,
): ExportEntry[] {
  if (typeof exports === "string") {
    return [
      { subpath: ".", condition: "default", value: exports, conditionKeys: [] },
    ];
  }

  const results: ExportEntry[] = [];

  function walkConditions(
    subpath: string,
    obj: Record<string, unknown>,
  ): void {
    const keys = Object.keys(obj);
    for (const key of keys) {
      const val = obj[key];
      if (typeof val === "string") {
        results.push({ subpath, condition: key, value: val, conditionKeys: keys });
      } else if (Array.isArray(val)) {
        for (const item of val) {
          if (typeof item === "string") {
            results.push({ subpath, condition: key, value: item, conditionKeys: keys, isFallbackArray: true });
          } else if (typeof item === "object" && item !== null) {
            walkConditions(subpath, item as Record<string, unknown>);
          }
        }
      } else if (typeof val === "object" && val !== null) {
        walkConditions(subpath, val as Record<string, unknown>);
      }
    }
  }

  const keys = Object.keys(exports);
  const hasSubpaths = keys.some((k) => k.startsWith("."));

  if (hasSubpaths) {
    for (const key of keys) {
      const val = exports[key];
      if (typeof val === "string") {
        results.push({
          subpath: key,
          condition: "default",
          value: val,
          conditionKeys: [],
        });
      } else if (Array.isArray(val)) {
        for (const item of val) {
          if (typeof item === "string") {
            results.push({ subpath: key, condition: "default", value: item, conditionKeys: [], isFallbackArray: true });
          } else if (typeof item === "object" && item !== null) {
            walkConditions(key, item as Record<string, unknown>);
          }
        }
      } else if (typeof val === "object" && val !== null) {
        walkConditions(key, val as Record<string, unknown>);
      }
    }
  } else if (isSugarForm(exports)) {
    walkConditions(".", exports);
  }

  return results;
}
