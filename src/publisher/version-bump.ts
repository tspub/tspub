function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function bumpVersion(version: string, bump: string): string {
  const baseVersion = version.replace(/-.*$/, "");
  const parts = baseVersion.split(".").map(Number);
  const [major = 0, minor = 0, patch = 0] = parts;

  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      if (/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(bump)) return bump;
      throw new Error(
        `Invalid bump: "${bump}". Use major, minor, patch, or an explicit version.`,
      );
  }
}

/**
 * Create or increment a prerelease version.
 *
 * If the version already has the given prerelease tag, increments the counter
 * (e.g. 1.2.3-beta.0 → 1.2.3-beta.1). If `bump` is also provided alongside
 * an existing tag, the explicit bump takes precedence and resets the counter
 * (e.g. bumpPrerelease("1.2.3-beta.5", "beta", "minor") → 1.3.0-beta.0).
 */
export function bumpPrerelease(
  version: string,
  tag: string,
  bump?: string,
): string {
  const escapedTag = escapeRegExp(tag);
  const preRegex = new RegExp(`-${escapedTag}\\.(\\d+)$`);
  const match = version.match(preRegex);

  if (bump) {
    const base = bumpVersion(version, bump);
    return `${base}-${tag}.0`;
  }

  if (match) {
    const num = Number(match[1]) + 1;
    return version.replace(preRegex, `-${tag}.${num}`);
  }

  const base = bumpVersion(version, "patch");
  return `${base}-${tag}.0`;
}
