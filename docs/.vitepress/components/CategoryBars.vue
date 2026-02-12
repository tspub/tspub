<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  categories: Record<string, number>;
}>();

const order = ["exports", "types", "files", "metadata", "size"];

const items = computed(() =>
  order.map((cat) => ({
    label: cat,
    score: props.categories[cat] ?? 100,
    color:
      (props.categories[cat] ?? 100) >= 80
        ? "#22c55e"
        : (props.categories[cat] ?? 100) >= 50
          ? "#eab308"
          : "#ef4444",
  })),
);
</script>

<template>
  <div class="category-bars">
    <template v-for="item in items" :key="item.label">
      <span class="cat-label">{{ item.label }}</span>
      <div class="cat-bar">
        <div
          class="cat-bar-fill"
          :style="{ width: item.score + '%', background: item.color }"
        />
      </div>
      <span class="cat-score" :style="{ color: item.color }">{{
        item.score
      }}</span>
    </template>
  </div>
</template>
