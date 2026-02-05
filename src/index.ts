/** Build TypeScript packages to ESM + CJS with declaration files. */
export { build } from "./builder/index.js";

/** Run all checker rules against a package directory. */
export { check } from "./checker/index.js";

/** Scaffold a new TypeScript package from templates. */
export { scaffold } from "./scaffold/index.js";

/** Result of a single checker rule execution. */
export type { CheckResult, CheckSeverity } from "./checker/index.js";

/** Options for the build command. */
export type { BuildOptions } from "./builder/index.js";

/** Options for the scaffold command. */
export type { ScaffoldOptions } from "./scaffold/index.js";

/** Scan remote GitHub repositories for packaging issues. */
export { scan } from "./scanner/index.js";

/** Options and results for the scan command. */
export type { ScanOptions, ScanResult, PackageScanResult, FixChange, ScanError } from "./scanner/index.js";

/** Load tspub configuration from tspub.config.ts or package.json. */
export { loadConfig, loadConfigWithInheritance, invalidateConfigCache } from "./config/index.js";

/** Configuration types for tspub.config.ts. */
export type { TspubConfig, TspubBuildConfig, TspubPublishConfig, TspubCheckConfig, TspubDoctorConfig, TspubScanConfig } from "./config/index.js";

/** Diagnose and auto-fix common TypeScript package issues. */
export { doctor } from "./doctor/index.js";

/** Result from the doctor command. */
export type { DoctorResult, DoctorOptions } from "./doctor/index.js";

/** Doctor rule types for plugin authors. */
export type { DoctorRule, DoctorRuleMeta, DoctorContext } from "./doctor/framework/types.js";

/** Load doctor plugins from npm packages or local paths. */
export { loadDoctorPlugins } from "./doctor/plugins.js";

/** Generate a changelog from git history or conventional commits. */
export { generateChangelog } from "./builder/changelog.js";

/** Changelog style: "simple", "conventional", or "auto". */
export type { ChangelogStyle } from "./builder/changelog.js";

/** Debug type resolution across node10, node16, and bundler modes. */
export { debugResolution } from "./doctor/resolution.js";

/** Log level for the internal logger. */
export type { LogLevel } from "./shared/logger.js";

// Workspace
/** Discover, sort, and filter packages in a monorepo workspace. */
export { discoverWorkspaces, topoSort, isMonorepoRoot, filterPackages } from "./workspace/index.js";

/** A package discovered in a monorepo workspace. */
export type { WorkspacePackage } from "./workspace/index.js";

// Publisher
/** Bump version strings. */
export { bumpVersion, bumpPrerelease } from "./publisher/version-bump.js";

/** Publish a single package or monorepo. */
export { publishPackage, publishMonorepo } from "./publisher/publish.js";

/** Publish types. */
export type { PublishOptions, PublishResult } from "./publisher/types.js";

/** Prereq rule types. */
export type { PrereqRule, PrereqDiagnostic } from "./publisher/framework/types.js";

// CI / Version
/** Resolve the next version bump from commit messages (conventional commits). */
export { resolveVersionBump } from "./publisher/version-from-commits.js";

/** Version bump type: "major", "minor", "patch", or null. */
export type { VersionBump } from "./publisher/version-from-commits.js";

// Plugin system
/** Load checker plugins from npm packages or local paths. */
export { loadPlugins } from "./checker/plugins.js";

/** Interface for tspub checker plugins. */
export type { TspubPlugin } from "./checker/plugins.js";

/** Core types for writing custom checker rules. */
export type { Rule, RuleMeta, CheckContext, Severity } from "./checker/framework/types.js";

/** Checker profiles (strict, library, app) and severity override parsing. */
export { PROFILES, ALLOW_LIST_PROFILES, CATEGORY_ORDER, RULE_MAPPING, parseSeverityOverrides } from "./checker/profiles.js";

/** Checker output formatters for programmatic consumers. */
export { groupResultsByCategory, printGroupedResults, printResolutionTable, printListRules } from "./checker/formatter.js";

// Scanner report
/** Generate markdown reports and summary stats from scan results. */
export { generateMarkdownReport, generateSummaryStats } from "./scanner/report.js";

// Type tester
/** Run .test-d.ts type declaration tests against built output. */
export { runTypeTests } from "./type-tester/index.js";

/** Results and options for the type tester. */
export type { TypeTestResult, TypeTestError, TypeTestOptions } from "./type-tester/index.js";
