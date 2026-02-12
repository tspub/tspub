<script setup lang="ts">
import { ref } from "vue";
import FixDiff from "./FixDiff.vue";

const props = defineProps<{
  result: {
    ruleId: string;
    severity: string;
    message: string;
    fixable: false | "safe" | "unsafe";
    publint: string | null;
    attw: string | null;
  };
  fixDiff?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
}>();

const showFix = ref(false);

const severityIcon: Record<string, string> = {
  error: "\u2717",
  warning: "\u26a0",
  info: "\u2139",
};

const ruleDocPath = `/check/rules/${props.result.ruleId.split("/")[0]}/`;
</script>

<template>
  <div class="result-row">
    <span class="severity-icon" :class="result.severity">{{
      severityIcon[result.severity] ?? "\u2713"
    }}</span>
    <div class="result-content">
      <a class="rule-id" :href="ruleDocPath">{{ result.ruleId }}</a>
      <div class="rule-message">{{ result.message }}</div>
      <div class="comparison-tags">
        <span
          class="comparison-tag"
          :class="result.publint ? 'covered' : 'not-covered'"
        >
          publint: {{ result.publint ? "\u2713" : "\u2014" }}
        </span>
        <span
          class="comparison-tag"
          :class="result.attw ? 'covered' : 'not-covered'"
        >
          attw: {{ result.attw ? "\u2713" : "\u2014" }}
        </span>
      </div>
    </div>
    <button
      v-if="fixDiff && result.fixable"
      class="fix-toggle"
      @click="showFix = !showFix"
    >
      {{ showFix ? "Hide fix" : "Show fix" }}
    </button>
  </div>
  <FixDiff
    v-if="showFix && fixDiff"
    :before="fixDiff.before"
    :after="fixDiff.after"
  />
</template>
