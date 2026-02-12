<script setup lang="ts">
import { ref, watch } from "vue";
import ScoreRing from "./ScoreRing.vue";

const props = defineProps<{
  repo: string;
}>();

interface PkgResult {
  name: string;
  path: string;
  score: number;
  grade: string;
  categoryScores: Record<string, number>;
  errors: number;
  warnings: number;
  results: Array<{
    ruleId: string;
    severity: string;
    message: string;
    category: string;
    fixable: false | "safe" | "unsafe";
  }>;
}

interface ScanData {
  repo: string;
  overallScore: number;
  packageCount: number;
  packages: PkgResult[];
  topIssues: Array<{
    ruleId: string;
    count: number;
    message: string;
  }>;
}

const loading = ref(false);
const error = ref("");
const data = ref<ScanData | null>(null);
const expandedPkg = ref<string | null>(null);

async function fetchScan(repo: string) {
  loading.value = true;
  error.value = "";
  data.value = null;

  try {
    const res = await fetch(
      `/api/scan?repo=${encodeURIComponent(repo)}`,
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    data.value = (await res.json()) as ScanData;
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to scan repo";
  } finally {
    loading.value = false;
  }
}

function toggleExpand(name: string) {
  expandedPkg.value = expandedPkg.value === name ? null : name;
}

watch(
  () => props.repo,
  (val) => {
    if (val) fetchScan(val);
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="loading" class="loading-skeleton">
    <div class="skeleton-line" style="width: 50%" />
    <div class="skeleton-line" style="width: 80%" />
    <div class="skeleton-line" style="width: 65%" />
    <div class="skeleton-line" style="width: 90%" />
  </div>

  <div v-else-if="error" class="error-state">
    <div class="error-title">Error</div>
    <p>{{ error }}</p>
  </div>

  <div v-else-if="data" class="scan-report">
    <div class="check-results-header">
      <div class="left">
        <ScoreRing :score="data.overallScore" />
        <div class="check-results-pkg">
          <span class="pkg-name">{{ data.repo }}</span>
          <span class="pkg-version"
            >{{ data.packageCount }} package{{
              data.packageCount !== 1 ? "s" : ""
            }}
            found</span
          >
        </div>
      </div>
    </div>

    <!-- Package table -->
    <table>
      <thead>
        <tr>
          <th>Package</th>
          <th>Score</th>
          <th>Errors</th>
          <th>Warnings</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="pkg in data.packages" :key="pkg.name">
          <tr class="clickable" @click="toggleExpand(pkg.name)">
            <td>
              <strong>{{ pkg.name }}</strong>
            </td>
            <td>
              <span
                class="pkg-score"
                :style="{
                  color:
                    pkg.score >= 80
                      ? '#22c55e'
                      : pkg.score >= 50
                        ? '#eab308'
                        : '#ef4444',
                }"
              >
                {{ pkg.score }}
              </span>
            </td>
            <td>
              <span v-if="pkg.errors > 0" class="issue-count errors">
                {{ pkg.errors }}
              </span>
              <span v-else style="color: var(--vp-c-text-3)">0</span>
            </td>
            <td>
              <span v-if="pkg.warnings > 0" class="issue-count warnings">
                {{ pkg.warnings }}
              </span>
              <span v-else style="color: var(--vp-c-text-3)">0</span>
            </td>
          </tr>
          <tr v-if="expandedPkg === pkg.name">
            <td colspan="4" style="padding: 16px">
              <div
                v-for="r in pkg.results.filter(
                  (r) =>
                    r.severity === 'error' || r.severity === 'warning',
                )"
                :key="r.ruleId"
                class="result-row"
              >
                <span
                  class="severity-icon"
                  :class="r.severity"
                >{{
                  r.severity === "error"
                    ? "\u2717"
                    : r.severity === "warning"
                      ? "\u26a0"
                      : "\u2139"
                }}</span>
                <div class="result-content">
                  <span class="rule-id" style="cursor: default">{{
                    r.ruleId
                  }}</span>
                  <div class="rule-message">{{ r.message }}</div>
                </div>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <!-- Top issues -->
    <div
      v-if="data.topIssues.length > 0"
      style="margin-top: 24px"
    >
      <div class="results-section-title">Top issues across repo</div>
      <div
        v-for="issue in data.topIssues"
        :key="issue.ruleId"
        class="result-row"
      >
        <span class="severity-icon warning" style="font-weight: 700">
          {{ issue.count }}x
        </span>
        <div class="result-content">
          <span class="rule-id" style="cursor: default">{{
            issue.ruleId
          }}</span>
          <div class="rule-message">{{ issue.message }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
