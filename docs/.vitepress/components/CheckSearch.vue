<script setup lang="ts">
import { ref, watch } from "vue";

const emit = defineEmits<{
  (e: "search", pkg: string): void;
}>();

const props = defineProps<{
  initialPkg?: string;
}>();

const query = ref(props.initialPkg ?? "");
const suggestions = ref<Array<{ name: string; version: string }>>([]);
const showSuggestions = ref(false);
let debounceTimer: ReturnType<typeof setTimeout>;

watch(query, (val) => {
  clearTimeout(debounceTimer);
  if (!val || val.length < 2) {
    suggestions.value = [];
    showSuggestions.value = false;
    return;
  }
  debounceTimer = setTimeout(() => fetchSuggestions(val), 300);
});

async function fetchSuggestions(text: string) {
  try {
    const res = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(text)}&size=8`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as {
      objects: Array<{
        package: { name: string; version: string };
      }>;
    };
    suggestions.value = data.objects.map((o) => ({
      name: o.package.name,
      version: o.package.version,
    }));
    showSuggestions.value = suggestions.value.length > 0;
  } catch {
    suggestions.value = [];
  }
}

function selectPkg(name: string) {
  query.value = name;
  showSuggestions.value = false;
  emit("search", name);
}

function onSubmit() {
  if (query.value.trim()) {
    showSuggestions.value = false;
    emit("search", query.value.trim());
  }
}

function onBlur() {
  // Delay to allow click on suggestion
  setTimeout(() => (showSuggestions.value = false), 200);
}

if (props.initialPkg) {
  emit("search", props.initialPkg);
}
</script>

<template>
  <div class="check-search">
    <input
      v-model="query"
      type="text"
      placeholder="Search npm packages... (e.g. chalk, react, lodash)"
      @keydown.enter="onSubmit"
      @focus="showSuggestions = suggestions.length > 0"
      @blur="onBlur"
    />
    <div v-if="showSuggestions" class="suggestions">
      <div
        v-for="s in suggestions"
        :key="s.name"
        class="suggestion-item"
        @mousedown.prevent="selectPkg(s.name)"
      >
        <span class="pkg-name">{{ s.name }}</span>
        <span class="pkg-version">{{ s.version }}</span>
      </div>
    </div>
  </div>
</template>
