import type { PackageJson } from "../../shared/package-json.js";

export type DoctorSeverity = "error" | "warning" | "info";

export interface DoctorRuleMeta {
  id: string;
  description: string;
  defaultSeverity: DoctorSeverity;
  fixable: false | "safe" | "unsafe";
  category: string;
}

export interface DoctorRawDiagnostic {
  severity: DoctorSeverity;
  message: string;
  data?: Record<string, unknown>;
}

export interface DoctorDiagnostic extends DoctorRawDiagnostic {
  ruleId: string;
}

export interface DoctorContext {
  pkg: PackageJson;
  dir: string;
  compilerOptions: Record<string, unknown> | null;
  hasBuildOutput: boolean;
  distFiles: string[];
  lockFiles: string[];
}

export interface DoctorFixContext {
  pkg: PackageJson;
  dir: string;
}

export interface DoctorFixResult {
  message: string;
  pkgModified: boolean;
}

export interface DoctorRule {
  meta: DoctorRuleMeta;
  check(ctx: DoctorContext): DoctorRawDiagnostic[] | Promise<DoctorRawDiagnostic[]>;
  fix?(ctx: DoctorFixContext): DoctorFixResult | Promise<DoctorFixResult>;
}
