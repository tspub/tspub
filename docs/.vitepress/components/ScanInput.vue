<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{
  (e: "scan", repo: string): void;
}>();

const props = defineProps<{
  initialRepo?: string;
}>();

const input = ref(props.initialRepo ?? "");

function onSubmit() {
  let repo = input.value.trim();
  // Strip github.com prefix if present
  repo = repo.replace(/^https?:\/\/(www\.)?github\.com\//, "");
  // Remove trailing .git
  repo = repo.replace(/\.git$/, "");
  // Remove trailing slashes
  repo = repo.replace(/\/+$/, "");
  if (repo) {
    emit("scan", repo);
  }
}

if (props.initialRepo) {
  emit("scan", props.initialRepo);
}
</script>

<template>
  <div class="check-search">
    <input
      v-model="input"
      type="text"
      placeholder="GitHub repo (e.g. sindresorhus/chalk or full URL)"
      @keydown.enter="onSubmit"
    />
  </div>
</template>
