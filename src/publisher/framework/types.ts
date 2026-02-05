import type { PackageJson } from "../../shared/package-json.js";
import type { TspubPublishConfig } from "../../config/types.js";

export interface PrereqRuleMeta {
  id: string;
  description: string;
  blocking: boolean;
}

export interface PrereqContext {
  dir: string;
  pkg: PackageJson;
  dryRun: boolean;
  isCi: boolean;
  config: TspubPublishConfig | null;
  registry?: string;
  registryArgs: string[];
}

export interface PrereqDiagnostic {
  severity: "error" | "warning" | "info";
  message: string;
  ruleId: string;
}

export interface PrereqRule {
  meta: PrereqRuleMeta;
  check(ctx: PrereqContext): PrereqDiagnostic[] | Promise<PrereqDiagnostic[]>;
}
