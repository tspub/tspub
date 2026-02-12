<script setup lang="ts">
defineProps<{
  stage: string;
}>();

const stages: Record<
  string,
  { title: string; items: string[]; callout: string }
> = {
  gates: {
    title: "5 Prereq Gates",
    items: [
      "Git tree is clean",
      "On correct branch (main)",
      "npm registry reachable",
      "Authenticated to npm",
      "tspub check passes",
    ],
    callout:
      'If ANY gate fails, publish is blocked. No more "oops, I published from a feature branch."',
  },
  build: {
    title: "Build",
    items: [
      "Runs tspub build (esbuild under the hood)",
      "Generates ESM + optional CJS outputs",
      "Bundles .d.ts declaration files",
      "Reports bundle sizes with gzip",
    ],
    callout:
      "Clean build before every publish ensures dist/ matches source.",
  },
  check: {
    title: "Check (70 Rules)",
    items: [
      "Validates exports, types, files, metadata, size",
      "Catches issues publint and attw miss",
      "Auto-fix available for many rules",
      "Blocks publish if errors found",
    ],
    callout:
      "Same rules that power the playground above. Every publish goes through them.",
  },
  bump: {
    title: "Version Bump",
    items: [
      "Bumps version in package.json (patch/minor/major)",
      "Creates git tag",
      "Commits version change",
    ],
    callout:
      "Version, tag, and commit happen atomically before npm publish.",
  },
  publish: {
    title: "npm Publish",
    items: [
      "Runs npm publish with provenance",
      "On failure: git tag removed, version reverted",
      "On success: pushes tag and commit to remote",
    ],
    callout:
      "The rollback guarantee: if publish fails, your repo is back to pre-publish state. No half-broken releases.",
  },
};
</script>

<template>
  <div v-if="stages[stage]" class="stage-detail">
    <h3>{{ stages[stage]!.title }}</h3>
    <ul>
      <li v-for="item in stages[stage]!.items" :key="item">{{ item }}</li>
    </ul>
    <div class="callout">{{ stages[stage]!.callout }}</div>
  </div>
</template>
