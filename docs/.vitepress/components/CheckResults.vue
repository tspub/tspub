<script setup lang="ts">
import { ref, computed, watch } from "vue";
import ScoreRing from "./ScoreRing.vue";
import CategoryBars from "./CategoryBars.vue";
import ResultRow from "./ResultRow.vue";
import BadgeCopy from "./BadgeCopy.vue";

const props = defineProps<{
  pkg: string;
}>();

interface Result {
  ruleId: string;
  severity: string;
  message: string;
  category: string;
  fixable: false | "safe" | "unsafe";
  publint: string | null;
  attw: string | null;
}

interface FixDiffEntry {
  ruleId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

interface CheckData {
  package: string;
  version: string;
  score: number;
  grade: string;
  categoryScores: Record<string, number>;
  results: Result[];
  fixDiffs: FixDiffEntry[];
  comparison: {
    tspubFinds: number;
    publintOverlap: number;
    attwOverlap: number;
    tspubOnly: number;
  };
  categoryOrder: string[];
}

const loading = ref(false);
const error = ref("");
const data = ref<CheckData | null>(null);

const issueResults = computed(() =>
  data.value
    ? data.value.results.filter(
        (r) => r.severity === "error" || r.severity === "warning",
      )
    : [],
);

const groupedResults = computed(() => {
  if (!data.value) return new Map<string, Result[]>();
  const groups = new Map<string, Result[]>();
  for (const cat of data.value.categoryOrder) {
    const catResults = issueResults.value.filter((r) => r.category === cat);
    if (catResults.length > 0) {
      groups.set(cat, catResults);
    }
  }
  return groups;
});

function getFixDiff(ruleId: string): FixDiffEntry | undefined {
  return data.value?.fixDiffs.find((f) => f.ruleId === ruleId);
}

async function fetchCheck(pkgName: string) {
  loading.value = true;
  error.value = "";
  data.value = null;

  try {
    const res = await fetch(
      `/api/check?pkg=${encodeURIComponent(pkgName)}`,
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    data.value = (await res.json()) as CheckData;
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to check package";
  } finally {
    loading.value = false;
  }
}

function copyFixedPkg() {
  if (!data.value?.fixDiffs.length) return;
  // Apply all fix diffs to get the final fixed package.json
  const last = data.value.fixDiffs[data.value.fixDiffs.length - 1];
  if (last) {
    navigator.clipboard.writeText(JSON.stringify(last.after, null, 2));
  }
}

watch(
  () => props.pkg,
  (val) => {
    if (val) fetchCheck(val);
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="loading" class="loading-skeleton" role="status" aria-label="Loading results">
    <div class="skeleton-line" style="width: 60%" />
    <div class="skeleton-line" style="width: 80%" />
    <div class="skeleton-line" style="width: 40%" />
    <div class="skeleton-line" style="width: 90%" />
    <div class="skeleton-line" style="width: 55%" />
  </div>

  <div v-else-if="error" class="error-state" role="alert">
    <div class="error-title">Error</div>
    <p>{{ error }}</p>
  </div>

  <div v-else-if="data" aria-live="polite">
    <!-- Header: Score + Package info + Category bars -->
    <div class="check-results-header">
      <div class="left">
        <ScoreRing :score="data.score" />
        <div class="check-results-pkg">
          <span class="pkg-name">{{ data.package }}</span>
          <span class="pkg-version">v{{ data.version }}</span>
        </div>
      </div>
      <CategoryBars :categories="data.categoryScores" />
    </div>

    <!-- Results grouped by category -->
    <div v-for="[cat, results] in groupedResults" :key="cat">
      <div class="results-section-title">{{ cat }}</div>
      <ResultRow
        v-for="(result, i) in results"
        :key="result.ruleId + i"
        :result="result"
        :fix-diff="getFixDiff(result.ruleId)"
      />
    </div>

    <!-- Summary -->
    <div class="check-summary">
      <div class="summary-text">
        <strong>tspub</strong> found
        <strong>{{ data.comparison.tspubFinds }}</strong> issues —
        <strong>{{ data.comparison.publintOverlap }}</strong> overlap with publint,
        <strong>{{ data.comparison.attwOverlap }}</strong> overlap with attw<template v-if="data.comparison.tspubOnly > 0">,
        <strong>{{ data.comparison.tspubOnly }}</strong> caught only by tspub</template>.
      </div>
      <div class="summary-actions">
        <button
          v-if="data.fixDiffs.length > 0"
          class="btn"
          @click="copyFixedPkg"
        >
          Copy fixed package.json
        </button>
      </div>
    </div>

    <!-- Badge -->
    <BadgeCopy
      :pkg="data.package"
      :score="data.score"
      :grade="data.grade"
    />
  </div>
</template>
