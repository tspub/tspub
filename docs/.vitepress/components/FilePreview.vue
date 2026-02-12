<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{
  files: Map<string, string>;
  pkgName?: string;
}>();

const selectedFile = ref("");
const fileList = computed(() => [...props.files.keys()]);

// Select first file by default
if (fileList.value.length > 0 && !selectedFile.value) {
  selectedFile.value = fileList.value[0]!;
}

const content = computed(
  () => props.files.get(selectedFile.value) ?? "",
);

async function downloadZip() {
  // Use fflate for client-side zip generation
  const { zipSync, strToU8 } = await import("fflate");

  const zipData: Record<string, Uint8Array> = {};
  const prefix = props.pkgName ?? "package";
  for (const [name, content] of props.files) {
    zipData[`${prefix}/${name}`] = strToU8(content);
  }

  const zipped = zipSync(zipData);
  const blob = new Blob([zipped], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${prefix}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="file-preview">
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; border-bottom: 1px solid var(--vp-c-divider)">
      <span style="font-size: 14px; font-weight: 600">Preview</span>
      <button class="btn" @click="downloadZip">Download .zip</button>
    </div>
    <div style="display: flex; min-height: 300px">
      <div class="file-tree" style="min-width: 200px; border-right: 1px solid var(--vp-c-divider); border-bottom: none">
        <button
          v-for="f in fileList"
          :key="f"
          class="file-tree-item"
          :class="{ active: selectedFile === f }"
          @click="selectedFile = f"
        >
          {{ f }}
        </button>
      </div>
      <pre class="file-content" style="flex: 1; margin: 0">{{ content }}</pre>
    </div>
  </div>
</template>
