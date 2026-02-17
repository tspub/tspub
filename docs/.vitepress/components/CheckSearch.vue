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
const activeIndex = ref(-1);
let debounceTimer: ReturnType<typeof setTimeout>;
let justSelected = !!props.initialPkg;

const quickPicks = ["chalk", "react", "express", "zod", "next"];

watch(query, (val) => {
  clearTimeout(debounceTimer);
  activeIndex.value = -1;
  if (justSelected) {
    justSelected = false;
    return;
  }
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
  justSelected = true;
  query.value = name;
  suggestions.value = [];
  showSuggestions.value = false;
  activeIndex.value = -1;
  emit("search", name);
}

function onSubmit() {
  if (showSuggestions.value && activeIndex.value >= 0) {
    selectPkg(suggestions.value[activeIndex.value]!.name);
    return;
  }
  if (query.value.trim()) {
    showSuggestions.value = false;
    emit("search", query.value.trim());
  }
}

function onKeydown(e: KeyboardEvent) {
  if (!showSuggestions.value || suggestions.value.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeIndex.value =
      activeIndex.value < suggestions.value.length - 1
        ? activeIndex.value + 1
        : 0;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeIndex.value =
      activeIndex.value > 0
        ? activeIndex.value - 1
        : suggestions.value.length - 1;
  } else if (e.key === "Escape") {
    showSuggestions.value = false;
    activeIndex.value = -1;
  }
}

function onFocus() {
  if (!justSelected && suggestions.value.length > 0) {
    showSuggestions.value = true;
  }
}

function onBlur() {
  // Delay to allow click on suggestion
  setTimeout(() => {
    showSuggestions.value = false;
    activeIndex.value = -1;
  }, 200);
}

// Sync query when initialPkg changes after mount (e.g. hash state restoration)
watch(
  () => props.initialPkg,
  (val) => {
    if (val && val !== query.value) {
      justSelected = true;
      query.value = val;
      emit("search", val);
    }
  },
);

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
      aria-label="Search npm packages"
      role="combobox"
      :aria-expanded="showSuggestions"
      aria-autocomplete="list"
      aria-controls="check-suggestions"
      :aria-activedescendant="activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined"
      @keydown.enter="onSubmit"
      @keydown="onKeydown"
      @focus="onFocus"
      @blur="onBlur"
    />
    <div v-if="showSuggestions" id="check-suggestions" class="suggestions" role="listbox" aria-label="Package suggestions">
      <div
        v-for="(s, i) in suggestions"
        :key="s.name"
        :id="`suggestion-${i}`"
        class="suggestion-item"
        :class="{ active: i === activeIndex }"
        role="option"
        :aria-selected="i === activeIndex"
        @mousedown.prevent="selectPkg(s.name)"
        @mouseenter="activeIndex = i"
      >
        <span class="pkg-name">{{ s.name }}</span>
        <span class="pkg-version">{{ s.version }}</span>
      </div>
    </div>
    <div v-if="!query && !initialPkg" class="quick-picks">
      <span class="quick-picks-label">Try:</span>
      <button
        v-for="pkg in quickPicks"
        :key="pkg"
        class="quick-pick"
        @click="selectPkg(pkg)"
      >
        {{ pkg }}
      </button>
    </div>
  </div>
</template>
