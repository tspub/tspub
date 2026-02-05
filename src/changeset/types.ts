export type BumpType = "major" | "minor" | "patch";

export interface ChangesetEntry {
  packageName: string;
  bump: BumpType;
}

export interface Changeset {
  id: string;
  entries: ChangesetEntry[];
  summary: string;
}

export interface VersionUpdate {
  packageName: string;
  oldVersion: string;
  newVersion: string;
  bump: BumpType;
  changelog: string;
}

export interface DependentBumpStrategy {
  mode: "major" | "all" | "none";
}
