<script setup lang="ts">
import { ref, watch } from "vue";

const emit = defineEmits<{
  (e: "scan", repo: string): void;
}>();

const props = defineProps<{
  initialRepo?: string;
}>();

const input = ref(props.initialRepo ?? "");

const quickPicks = ["chalk/chalk", "sindresorhus/execa", "unjs/ofetch"];

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

function selectRepo(repo: string) {
  input.value = repo;
  emit("scan", repo);
}

// Sync input when initialRepo changes after mount (e.g. hash state restoration)
watch(
  () => props.initialRepo,
  (val) => {
    if (val && val !== input.value) {
      input.value = val;
      emit("scan", val);
    }
  },
);

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
      aria-label="GitHub repository"
      @keydown.enter="onSubmit"
    />
    <div v-if="!input && !initialRepo" class="quick-picks">
      <span class="quick-picks-label">Try:</span>
      <button
        v-for="repo in quickPicks"
        :key="repo"
        class="quick-pick"
        @click="selectRepo(repo)"
      >
        {{ repo }}
      </button>
    </div>
  </div>
</template>
