<script setup lang="ts">
import { ref } from "vue";
import StageDetail from "./StageDetail.vue";

const activeStage = ref("gates");

const stages = [
  { id: "gates", label: "Gates" },
  { id: "build", label: "Build" },
  { id: "check", label: "Check" },
  { id: "bump", label: "Bump" },
  { id: "publish", label: "Publish" },
];
</script>

<template>
  <div class="pipeline-viz">
    <div class="pipeline-stages">
      <template v-for="(stage, i) in stages" :key="stage.id">
        <div
          class="pipeline-stage"
          :class="{ active: activeStage === stage.id }"
          @click="activeStage = stage.id"
        >
          <div class="stage-box">{{ stage.label }}</div>
        </div>
        <span v-if="i < stages.length - 1" class="pipeline-arrow"
          >&rarr;</span
        >
      </template>
    </div>

    <StageDetail :stage="activeStage" />

    <div class="pipeline-comparison">
      <div class="comparison-card before">
        <h4>Before tspub</h4>
        <p style="font-size: 14px; color: var(--vp-c-text-2)">
          5 commands, 3 tools, manual checks, hope nothing breaks.
        </p>
        <code
          style="
            display: block;
            margin-top: 8px;
            font-size: 12px;
            color: var(--vp-c-text-3);
          "
        >
          npm run build<br />
          npx publint<br />
          npx attw --pack<br />
          npm version patch<br />
          npm publish
        </code>
      </div>
      <div class="comparison-card after">
        <h4>After tspub</h4>
        <p style="font-size: 14px; color: var(--vp-c-text-2)">
          One command. Build, check, bump, publish, rollback on failure.
        </p>
        <code
          style="
            display: block;
            margin-top: 8px;
            font-size: 16px;
            font-weight: 600;
            color: var(--vp-c-brand-1);
          "
        >
          tspub publish patch
        </code>
      </div>
    </div>

    <div
      style="
        margin-top: 24px;
        padding: 12px 16px;
        background: var(--vp-c-bg-soft);
        border-radius: 6px;
        border-left: 3px solid var(--vp-c-brand-1);
        font-size: 14px;
      "
    >
      Try it:
      <code style="display: block; margin-top: 4px">
        npx tspub publish patch --dry-run
      </code>
    </div>
  </div>
</template>
