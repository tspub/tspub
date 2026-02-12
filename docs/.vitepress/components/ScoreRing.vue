<script setup lang="ts">
import { computed, ref, onMounted } from "vue";

const props = defineProps<{
  score: number;
  size?: number;
}>();

const sz = computed(() => props.size ?? 120);
const radius = computed(() => (sz.value - 16) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const offset = ref(circumference.value);

const color = computed(() =>
  props.score >= 80 ? "#22c55e" : props.score >= 50 ? "#eab308" : "#ef4444",
);

const grade = computed(() => {
  const s = props.score;
  if (s >= 95) return "A+";
  if (s >= 90) return "A";
  if (s >= 85) return "B+";
  if (s >= 80) return "B";
  if (s >= 70) return "C";
  if (s >= 50) return "D";
  return "F";
});

onMounted(() => {
  requestAnimationFrame(() => {
    offset.value =
      circumference.value - (props.score / 100) * circumference.value;
  });
});
</script>

<template>
  <div class="score-ring" :style="{ width: sz + 'px', height: sz + 'px' }">
    <svg
      :width="sz"
      :height="sz"
      :viewBox="`0 0 ${sz} ${sz}`"
      style="transform: rotate(-90deg); position: absolute"
    >
      <circle
        :cx="sz / 2"
        :cy="sz / 2"
        :r="radius"
        fill="none"
        stroke="var(--vp-c-divider)"
        stroke-width="8"
      />
      <circle
        :cx="sz / 2"
        :cy="sz / 2"
        :r="radius"
        fill="none"
        :stroke="color"
        stroke-width="8"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        style="transition: stroke-dashoffset 1s ease-out"
      />
    </svg>
    <div
      style="
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
      "
    >
      <span class="score-value" :style="{ color }">{{ score }}</span>
      <span class="score-grade">{{ grade }}</span>
    </div>
  </div>
</template>

<style scoped>
.score-ring {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
