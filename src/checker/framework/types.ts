import type { PackageJson } from "../../shared/package-json.js";

export type Severity = "error" | "warning" | "info";

export interface RuleMeta {
  id: string;
  description: string;
  defaultSeverity: Severity;
  fixable: false | "safe" | "unsafe";
  category: string;
}

export interface RawDiagnostic {
  severity: Severity;
  message: string;
  data?: Record<string, unknown>;
}

export interface Diagnostic extends RawDiagnostic {
  ruleId: string;
}

export interface CheckContext {
  pkg: PackageJson;
  dir: string;
  compilerOptions: Record<string, unknown> | null;
  hasBuildOutput: boolean;
  distFiles: string[];
  allJsFiles: string[];
  hasUnresolvedExtends: boolean;
}

export interface FixContext {
  pkg: PackageJson;
  dir: string;
  distFiles: string[];
}

export interface FixResult {
  message: string;
  pkgModified: boolean;
}

export interface Rule {
  meta: RuleMeta;
  check(ctx: CheckContext): RawDiagnostic[] | Promise<RawDiagnostic[]>;
  fix?(ctx: FixContext): FixResult | Promise<FixResult>;
}
