import type { PrereqDiagnostic } from "./framework/types.js";

export interface PublishOptions {
  dryRun?: boolean;
  tag: string;
  otp?: string;
  access?: string;
  changelog: boolean;
  git: boolean;
  prerelease?: string;
  provenance?: boolean;
  registry?: string;
  changelogStyle?: string;
  ci?: boolean;
  filter?: string;
}

export interface PublishResult {
  success: boolean;
  name: string;
  version: string;
  oldVersion: string;
  skipped?: boolean;
  reason?: string;
  prereqDiagnostics: PrereqDiagnostic[];
}
