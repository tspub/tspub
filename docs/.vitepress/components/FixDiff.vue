<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}>();

interface DiffLine {
  type: "context" | "removed" | "added";
  text: string;
}

const lines = computed<DiffLine[]>(() => {
  const beforeLines = JSON.stringify(props.before, null, 2).split("\n");
  const afterLines = JSON.stringify(props.after, null, 2).split("\n");
  const result: DiffLine[] = [];

  // Simple line-by-line diff
  const maxLen = Math.max(beforeLines.length, afterLines.length);
  let i = 0;
  let j = 0;

  while (i < beforeLines.length || j < afterLines.length) {
    const bLine = i < beforeLines.length ? beforeLines[i] : undefined;
    const aLine = j < afterLines.length ? afterLines[j] : undefined;

    if (bLine === aLine) {
      result.push({ type: "context", text: bLine! });
      i++;
      j++;
    } else {
      // Find where lines resync
      let foundSync = false;
      for (let lookAhead = 1; lookAhead < 10; lookAhead++) {
        if (
          i + lookAhead < beforeLines.length &&
          beforeLines[i + lookAhead] === aLine
        ) {
          // Lines were removed
          for (let k = 0; k < lookAhead; k++) {
            result.push({ type: "removed", text: beforeLines[i + k]! });
          }
          i += lookAhead;
          foundSync = true;
          break;
        }
        if (
          j + lookAhead < afterLines.length &&
          afterLines[j + lookAhead] === bLine
        ) {
          // Lines were added
          for (let k = 0; k < lookAhead; k++) {
            result.push({ type: "added", text: afterLines[j + k]! });
          }
          j += lookAhead;
          foundSync = true;
          break;
        }
      }
      if (!foundSync) {
        if (bLine !== undefined) {
          result.push({ type: "removed", text: bLine });
          i++;
        }
        if (aLine !== undefined) {
          result.push({ type: "added", text: aLine });
          j++;
        }
      }
    }
  }

  // Only show lines near changes
  const filtered: DiffLine[] = [];
  const changeIndices = new Set<number>();
  result.forEach((line, idx) => {
    if (line.type !== "context") changeIndices.add(idx);
  });

  result.forEach((line, idx) => {
    const nearby = [...changeIndices].some(
      (ci) => Math.abs(ci - idx) <= 2,
    );
    if (nearby || line.type !== "context") {
      filtered.push(line);
    }
  });

  return filtered;
});
</script>

<template>
  <div class="fix-diff">
    <div
      v-for="(line, i) in lines"
      :key="i"
      class="diff-line"
      :class="line.type"
    >{{ line.type === "removed" ? "- " : line.type === "added" ? "+ " : "  " }}{{ line.text }}</div>
  </div>
</template>
