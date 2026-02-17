import type { VercelRequest, VercelResponse } from "@vercel/node";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fetchAndUnpack } from "./_lib/tarball.js";
import { computeScore } from "./_lib/score.js";
import { RULE_MAPPING, CATEGORY_ORDER } from "../src/checker/profiles.js";
import { allRules } from "../src/checker/rules/index.js";
import { buildContext } from "../src/checker/framework/context.js";
import { runRules } from "../src/checker/framework/runner.js";
import type { PackageJson } from "../src/shared/package-json.js";

// Rules that need the TypeScript compiler or dynamic import() which won't work in serverless
const SKIP_RULES = new Set([
  "types/resolution",
  "types/missing-export-equals",
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pkg = req.query["pkg"];
  const version = req.query["v"];

  if (!pkg || typeof pkg !== "string") {
    return res.status(400).json({ error: "Missing ?pkg= parameter" });
  }

  // Basic validation to prevent abuse
  if (!/^(@[\w.-]+\/)?[\w.-]+$/.test(pkg)) {
    return res.status(400).json({ error: "Invalid package name" });
  }

  let tmpDir: string | undefined;

  try {
    const tarball = await fetchAndUnpack(
      pkg,
      typeof version === "string" ? version : undefined,
    );

    // Write extracted files to a temp directory so rules can use normal fs APIs
    tmpDir = mkdtempSync(join(tmpdir(), "tspub-check-"));
    for (const [name, content] of tarball.files) {
      const filePath = join(tmpDir, name);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, content);
    }

    // Build context using the real filesystem-based context builder
    const pkgJson = tarball.pkg as PackageJson;
    const ctx = await buildContext(pkgJson, tmpDir);

    // Filter rules
    const rules = allRules.filter((r) => !SKIP_RULES.has(r.meta.id));

    // Run rules (no fix, no interactive)
    const { diagnostics } = await runRules(rules, ctx, {
      dir: tmpDir,
      pkg: pkgJson,
      fix: false,
    });

    // Build results with rule metadata
    const results = diagnostics.map((d) => {
      const rule = rules.find((r) => r.meta.id === d.ruleId);
      const mapping = RULE_MAPPING[d.ruleId];
      return {
        ruleId: d.ruleId,
        severity: d.severity,
        message: d.message,
        category: d.ruleId.split("/")[0],
        fixable: rule?.meta.fixable ?? false,
        publint: mapping?.publint ?? null,
        attw: mapping?.attw ?? null,
      };
    });

    // Compute fix diffs for fixable rules that failed
    const fixDiffs: Array<{
      ruleId: string;
      before: Record<string, unknown>;
      after: Record<string, unknown>;
    }> = [];

    const failedFixable = diagnostics.filter((d) => {
      const rule = rules.find((r) => r.meta.id === d.ruleId);
      return rule?.meta.fixable && rule.fix;
    });

    // Deduplicate by ruleId
    const seenRules = new Set<string>();
    for (const d of failedFixable) {
      if (seenRules.has(d.ruleId)) continue;
      seenRules.add(d.ruleId);

      const rule = rules.find((r) => r.meta.id === d.ruleId);
      if (!rule?.fix) continue;

      try {
        const clonedPkg = structuredClone(pkgJson);
        await rule.fix({
          pkg: clonedPkg,
          dir: tmpDir!,
          distFiles: ctx.distFiles,
        });
        // Only include if package.json actually changed
        const beforeStr = JSON.stringify(pkgJson);
        const afterStr = JSON.stringify(clonedPkg);
        if (beforeStr !== afterStr) {
          fixDiffs.push({
            ruleId: d.ruleId,
            before: pkgJson as Record<string, unknown>,
            after: clonedPkg as Record<string, unknown>,
          });
        }
      } catch {
        // Fix failed — skip
      }
    }

    // Score — count rules per category so silent passes are included
    const rulesPerCategory: Record<string, number> = {};
    for (const r of rules) {
      const cat = r.meta.id.split("/")[0]!;
      rulesPerCategory[cat] = (rulesPerCategory[cat] ?? 0) + 1;
    }
    const score = computeScore(results, rulesPerCategory);

    // Comparison summary — counts issues that overlap with each tool's coverage area
    const issues = results.filter(
      (r) => r.severity === "error" || r.severity === "warning",
    );
    const tspubFinds = issues.length;
    const publintOverlap = issues.filter((r) => r.publint).length;
    const attwOverlap = issues.filter((r) => r.attw).length;
    const tspubOnly = issues.filter((r) => !r.publint && !r.attw).length;

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.status(200).json({
      package: pkg,
      version: tarball.version,
      score: score.total,
      grade: score.grade,
      categoryScores: score.categories,
      results,
      fixDiffs,
      comparison: { tspubFinds, publintOverlap, attwOverlap, tspubOnly },
      rulesRun: rules.length,
      categoryOrder: CATEGORY_ORDER,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not found") ? 404 : 500;
    return res.status(status).json({ error: message });
  } finally {
    if (tmpDir) {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Cleanup failed — non-critical
      }
    }
  }
}
