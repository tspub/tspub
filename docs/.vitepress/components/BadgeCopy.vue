<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps<{
  pkg: string;
  score: number;
  grade: string;
}>();

const copied = ref("");

const badgeUrl = computed(
  () =>
    `https://img.shields.io/endpoint?url=${encodeURIComponent(`https://tspub.dev/api/badge?pkg=${props.pkg}`)}`,
);
const linkUrl = computed(() => `https://tspub.dev/check/${props.pkg}`);

const markdown = computed(
  () => `[![tspub score](${badgeUrl.value})](${linkUrl.value})`,
);
const html = computed(
  () =>
    `<a href="${linkUrl.value}"><img src="${badgeUrl.value}" alt="tspub score" /></a>`,
);

function copy(text: string, label: string) {
  navigator.clipboard.writeText(text);
  copied.value = label;
  setTimeout(() => (copied.value = ""), 2000);
}
</script>

<template>
  <div class="badge-copy">
    <h4>Add a badge to your README</h4>
    <div class="badge-preview">
      <img :src="badgeUrl" :alt="`tspub ${grade} (${score})`" />
    </div>
    <div class="badge-snippets">
      <div class="snippet">
        <label>Markdown</label>
        <code>{{ markdown }}</code>
        <button class="btn" @click="copy(markdown, 'md')">
          {{ copied === "md" ? "Copied!" : "Copy" }}
        </button>
      </div>
      <div class="snippet">
        <label>HTML</label>
        <code>{{ html }}</code>
        <button class="btn" @click="copy(html, 'html')">
          {{ copied === "html" ? "Copied!" : "Copy" }}
        </button>
      </div>
    </div>
  </div>
</template>
