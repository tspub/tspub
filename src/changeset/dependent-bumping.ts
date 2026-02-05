import type { BumpType } from "./types.js";

export interface PackageInfo {
  name: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

const BUMP_ORDER: Record<BumpType, number> = {
  patch: 0,
  minor: 1,
  major: 2,
};

function higherBump(a: BumpType, b: BumpType): BumpType {
  return BUMP_ORDER[a] >= BUMP_ORDER[b] ? a : b;
}

export function computeDependentBumps(
  packages: PackageInfo[],
  initialBumps: Map<string, BumpType>,
  mode: "major" | "all" | "none",
): Map<string, BumpType> {
  const bumps = new Map(initialBumps);

  if (mode === "none") {
    return bumps;
  }

  // Build reverse dependency map: package -> list of packages that depend on it
  const dependents = new Map<string, string[]>();
  for (const pkg of packages) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const dep of Object.keys(allDeps)) {
      let list = dependents.get(dep);
      if (!list) {
        list = [];
        dependents.set(dep, list);
      }
      list.push(pkg.name);
    }
  }

  // Propagate using a worklist to avoid copying the map each iteration
  const queue = [...bumps.keys()];
  const inQueue = new Set(queue);

  while (queue.length > 0) {
    const name = queue.shift()!;
    inQueue.delete(name);
    const bump = bumps.get(name)!;

    if (mode === "major" && bump !== "major") continue;

    const deps = dependents.get(name);
    if (!deps) continue;

    for (const dep of deps) {
      const existing = bumps.get(dep);
      if (!existing) {
        bumps.set(dep, "patch");
        if (!inQueue.has(dep)) { queue.push(dep); inQueue.add(dep); }
      } else {
        const higher = higherBump(existing, "patch");
        if (higher !== existing) {
          bumps.set(dep, higher);
          if (!inQueue.has(dep)) { queue.push(dep); inQueue.add(dep); }
        }
      }
    }
  }

  return bumps;
}
