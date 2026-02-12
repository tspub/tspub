---
layout: page
title: Playground
---

<script setup>
import { defineClientComponent } from 'vitepress'

const PlaygroundHub = defineClientComponent(() =>
  import('./.vitepress/components/PlaygroundHub.vue')
)
</script>

<PlaygroundHub />
