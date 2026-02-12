<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import CheckSearch from "./CheckSearch.vue";
import CheckResults from "./CheckResults.vue";
import PasteMode from "./PasteMode.vue";
import ScanInput from "./ScanInput.vue";
import ScanReport from "./ScanReport.vue";
import InitForm from "./InitForm.vue";
import PipelineViz from "./PipelineViz.vue";

const tabs = [
  { id: "check", label: "Check" },
  { id: "scan", label: "Scan" },
  { id: "init", label: "Init" },
  { id: "pipeline", label: "Pipeline" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const activeTab = ref<TabId>("check");
const checkMode = ref<"search" | "paste">("search");
const checkPkg = ref("");
const scanRepo = ref("");

function readState(): { tab: TabId; params: Record<string, string> } {
  // First check clean URL paths (from Vercel rewrites)
  const path = window.location.pathname;
  const checkMatch = path.match(/^\/check\/(.+)/);
  if (checkMatch) {
    return { tab: "check", params: { pkg: decodeURIComponent(checkMatch[1]!) } };
  }
  const scanMatch = path.match(/^\/scan\/(.+)/);
  if (scanMatch) {
    return { tab: "scan", params: { repo: decodeURIComponent(scanMatch[1]!) } };
  }

  // Fall back to hash state
  const hash = window.location.hash.slice(1);
  if (!hash) return { tab: "check", params: {} };

  const parts = hash.split("&");
  const tab = (parts[0] as TabId) || "check";
  const params: Record<string, string> = {};
  for (const part of parts.slice(1)) {
    const eq = part.indexOf("=");
    if (eq !== -1) {
      params[part.slice(0, eq)] = decodeURIComponent(part.slice(eq + 1));
    }
  }
  return { tab, params };
}

function writeState(tab: string, params: Record<string, string>) {
  const parts = [
    tab,
    ...Object.entries(params)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`),
  ];
  history.replaceState(null, "", `#${parts.join("&")}`);
}

function onCheckSearch(pkg: string) {
  checkPkg.value = pkg;
  writeState("check", { pkg });
}

function onScan(repo: string) {
  scanRepo.value = repo;
  writeState("scan", { repo });
}

function switchTab(tab: TabId) {
  activeTab.value = tab;
  if (tab === "check") {
    writeState("check", checkPkg.value ? { pkg: checkPkg.value } : {});
  } else if (tab === "scan") {
    writeState("scan", scanRepo.value ? { repo: scanRepo.value } : {});
  } else {
    writeState(tab, {});
  }
}

// Keyboard shortcut: / focuses search
onMounted(() => {
  const state = readState();
  activeTab.value = state.tab;
  if (state.params.pkg) {
    checkPkg.value = state.params.pkg;
  }
  if (state.params.repo) {
    scanRepo.value = state.params.repo;
  }

  document.addEventListener("keydown", (e) => {
    if (
      e.key === "/" &&
      !e.ctrlKey &&
      !e.metaKey &&
      document.activeElement?.tagName !== "INPUT" &&
      document.activeElement?.tagName !== "TEXTAREA"
    ) {
      e.preventDefault();
      const input = document.querySelector<HTMLInputElement>(
        ".check-search input",
      );
      input?.focus();
    }
  });
});
</script>

<template>
  <div class="playground-hub">
    <!-- Tab bar -->
    <div class="playground-tabs" role="tablist" aria-label="Playground sections">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`panel-${tab.id}`"
        class="playground-tab"
        :class="{ active: activeTab === tab.id }"
        @click="switchTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- CHECK tab -->
    <div v-if="activeTab === 'check'" id="panel-check" role="tabpanel" aria-label="Check packages">
      <div class="mode-toggle" role="group" aria-label="Check mode">
        <button
          :class="{ active: checkMode === 'search' }"
          :aria-pressed="checkMode === 'search'"
          @click="checkMode = 'search'"
        >
          Search npm
        </button>
        <button
          :class="{ active: checkMode === 'paste' }"
          :aria-pressed="checkMode === 'paste'"
          @click="checkMode = 'paste'"
        >
          Paste package.json
        </button>
      </div>

      <template v-if="checkMode === 'search'">
        <CheckSearch :initial-pkg="checkPkg" @search="onCheckSearch" />
        <CheckResults v-if="checkPkg" :pkg="checkPkg" />
      </template>
      <template v-else>
        <PasteMode />
      </template>
    </div>

    <!-- SCAN tab -->
    <div v-if="activeTab === 'scan'" id="panel-scan" role="tabpanel" aria-label="Scan repositories">
      <ScanInput :initial-repo="scanRepo" @scan="onScan" />
      <ScanReport v-if="scanRepo" :repo="scanRepo" />
    </div>

    <!-- INIT tab -->
    <div v-if="activeTab === 'init'" id="panel-init" role="tabpanel" aria-label="Initialize project">
      <InitForm />
    </div>

    <!-- PIPELINE tab -->
    <div v-if="activeTab === 'pipeline'" id="panel-pipeline" role="tabpanel" aria-label="Publish pipeline">
      <PipelineViz />
    </div>
  </div>
</template>
