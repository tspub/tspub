export interface ImportEntry {
  key: string;
  condition: string;
  value: string;
  conditionKeys: string[];
  isFallbackArray?: boolean;
}

export function walkImports(
  imports: Record<string, unknown> | undefined,
): ImportEntry[] {
  if (!imports || typeof imports !== "object") return [];

  const results: ImportEntry[] = [];

  function walkConditions(
    key: string,
    obj: Record<string, unknown>,
  ): void {
    const keys = Object.keys(obj);
    for (const k of keys) {
      const val = obj[k];
      if (typeof val === "string") {
        results.push({ key, condition: k, value: val, conditionKeys: keys });
      } else if (Array.isArray(val)) {
        for (const item of val) {
          if (typeof item === "string") {
            results.push({ key, condition: k, value: item, conditionKeys: keys, isFallbackArray: true });
          } else if (typeof item === "object" && item !== null) {
            walkConditions(key, item as Record<string, unknown>);
          }
        }
      } else if (typeof val === "object" && val !== null) {
        walkConditions(key, val as Record<string, unknown>);
      }
    }
  }

  for (const key of Object.keys(imports)) {
    if (!key.startsWith("#")) continue;
    const val = imports[key];
    if (typeof val === "string") {
      results.push({ key, condition: "default", value: val, conditionKeys: [] });
    } else if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === "string") {
          results.push({ key, condition: "default", value: item, conditionKeys: [], isFallbackArray: true });
        } else if (typeof item === "object" && item !== null) {
          walkConditions(key, item as Record<string, unknown>);
        }
      }
    } else if (typeof val === "object" && val !== null) {
      walkConditions(key, val as Record<string, unknown>);
    }
  }

  return results;
}
