<script setup lang="ts">
import { ref, watch, computed } from "vue";
import ScoreRing from "./ScoreRing.vue";
import CategoryBars from "./CategoryBars.vue";
import ResultRow from "./ResultRow.vue";

// Dynamic import to avoid SSR issues
const browserChecker = ref<{
  checkPackageJson: Function;
  fixPackageJson: Function;
  browserRules: any[];
  TOTAL_RULES: number;
  CATEGORY_ORDER: string[];
} | null>(null);

interface BrowserResult {
  ruleId: string;
  severity: string;
  message: string;
  category: string;
  fixable: false | "safe" | "unsafe";
  publint: string | null;
  attw: string | null;
}

const input = ref("");
const parseError = ref("");
const results = ref<BrowserResult[]>([]);

const WEIGHTS: Record<string, number> = {
  exports: 35,
  types: 25,
  files: 15,
  metadata: 15,
  size: 10,
};

const issueResults = computed(() =>
  results.value.filter(
    (r) => r.severity === "error" || r.severity === "warning",
  ),
);

const categoryScores = computed(() => {
  const byCategory: Record<string, BrowserResult[]> = {};
  for (const r of results.value) {
    const cat = r.ruleId.split("/")[0] ?? "other";
    (byCategory[cat] ??= []).push(r);
  }

  const scores: Record<string, number> = {};
  for (const [cat, catResults] of Object.entries(byCategory)) {
    const errors = catResults.filter((r) => r.severity === "error").length;
    const warnings = catResults.filter((r) => r.severity === "warning").length;
    const total = catResults.length;
    const earned = total - errors - warnings * 0.5;
    scores[cat] = total > 0 ? Math.round((earned / total) * 100) : 100;
  }
  return scores;
});

const totalScore = computed(() => {
  let s = 0;
  for (const [cat, weight] of Object.entries(WEIGHTS)) {
    s += ((categoryScores.value[cat] ?? 100) * weight) / 100;
  }
  return Math.round(s);
});

const groupedResults = computed(() => {
  const order = ["exports", "types", "files", "metadata", "size"];
  const groups = new Map<string, BrowserResult[]>();
  for (const cat of order) {
    const catResults = issueResults.value.filter((r) => r.category === cat);
    if (catResults.length > 0) groups.set(cat, catResults);
  }
  return groups;
});

// Load browser checker dynamically
if (typeof window !== "undefined") {
  import("../../../src/checker/browser.js").then((mod) => {
    browserChecker.value = mod as any;
  });
}

let debounceTimer: ReturnType<typeof setTimeout>;

watch(input, (val) => {
  clearTimeout(debounceTimer);
  if (!val.trim()) {
    results.value = [];
    parseError.value = "";
    return;
  }
  debounceTimer = setTimeout(() => runCheck(val), 300);
});

function runCheck(json: string) {
  parseError.value = "";
  results.value = [];

  let pkg: any;
  try {
    pkg = JSON.parse(json);
  } catch (err) {
    parseError.value =
      err instanceof Error ? err.message : "Invalid JSON";
    return;
  }

  if (!browserChecker.value) {
    parseError.value = "Checker is loading...";
    return;
  }

  results.value = browserChecker.value.checkPackageJson(pkg);
}

function copyFixed() {
  if (!browserChecker.value || !input.value) return;
  try {
    const pkg = JSON.parse(input.value);
    const fixed = browserChecker.value.fixPackageJson(pkg, results.value);
    navigator.clipboard.writeText(JSON.stringify(fixed, null, 2));
  } catch {
    // Ignore
  }
}
</script>

<template>
  <div class="paste-mode">
    <textarea
      v-model="input"
      placeholder="Paste your package.json here..."
      spellcheck="false"
      aria-label="Package JSON input"
    />
    <div v-if="parseError" class="paste-error">{{ parseError }}</div>
    <div v-else-if="!input.trim()" class="paste-hint">
      Paste a package.json to check {{ browserChecker?.browserRules.length ?? "..." }} rules instantly in your browser.
      Install tspub for all {{ browserChecker?.TOTAL_RULES ?? 60 }} rules.
    </div>

    <div v-if="results.length > 0" style="margin-top: 24px">
      <div class="check-results-header">
        <div class="left">
          <ScoreRing :score="totalScore" :size="100" />
        </div>
        <CategoryBars :categories="categoryScores" />
      </div>

      <div v-for="[cat, catResults] in groupedResults" :key="cat">
        <div class="results-section-title">{{ cat }}</div>
        <ResultRow
          v-for="(result, i) in catResults"
          :key="result.ruleId + i"
          :result="result"
        />
      </div>

      <div class="check-summary">
        <div class="summary-text">
          Checked <strong>{{ browserChecker?.browserRules.length ?? 0 }}</strong> of
          <strong>{{ browserChecker?.TOTAL_RULES ?? 60 }}</strong> rules.
          Install tspub for all {{ browserChecker?.TOTAL_RULES ?? 60 }}.
        </div>
        <div class="summary-actions">
          <button class="btn" @click="copyFixed">
            Copy fixed package.json
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
