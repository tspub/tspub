---
layout: home
hero:
  name: tspub
  text: Stop shipping broken packages
  tagline: One CLI to build, validate, and publish TypeScript packages. 70 rules. Auto-fix. Zero config.
  actions:
    - theme: brand
      text: Get Started →
      link: /guide/getting-started
    - theme: alt
      text: Try Now
      link: /playground
  image:
    src: /logo.svg
    alt: tspub

features:
  - icon: 🔍
    title: 70 Validation Rules
    details: Exports, types, files, metadata, size. Everything publint + attw check, plus rules they miss. Auto-fix included.
    link: /check/
    linkText: See all rules →

  - icon: ⚡
    title: Lightning Fast Builds
    details: ESM + CJS + .d.ts in seconds. Powered by esbuild. Zero config. Smart entry detection.
    link: /build/
    linkText: Build options →

  - icon: 🚀
    title: Publish with Confidence
    details: 5 prereq gates → build → check → version → publish. Automatic rollback if npm fails.
    link: /publish/
    linkText: Publish workflow →

  - icon: 🩺
    title: Project Diagnostics
    details: 16 doctor rules. Node version, tsconfig issues, stale builds, duplicate deps. Auto-fix.
    link: /guide/getting-started#doctor
    linkText: Run doctor →

  - icon: 🔬
    title: Audit Any Repo
    details: Scan GitHub repos for packaging issues. Great for vetting dependencies before install.
    link: /guide/getting-started#scan
    linkText: Try scanning →

  - icon: 🔁
    title: Builds Itself
    details: tspub builds itself. The same build pipeline you use is the one that produces tspub. Dogfooded from day one.
    link: /build/
    linkText: Build options →

  - icon: 🔌
    title: Plugin System
    details: Write custom rules. Load from npm or local files. Severity overrides. Profiles.
    link: /check/plugins
    linkText: Build a plugin →
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: linear-gradient(135deg, #3178c6 0%, #10b981 100%);
  --vp-home-hero-image-background-image: linear-gradient(135deg, #3178c650 0%, #10b98150 100%);
  --vp-home-hero-image-filter: blur(72px);
}

.dark {
  --vp-home-hero-image-background-image: linear-gradient(135deg, #3178c630 0%, #10b98130 100%);
}

.testimonial {
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 24px;
  margin: 16px 0;
  border-left: 4px solid var(--vp-c-brand);
}

.testimonial p {
  margin: 0;
  font-style: italic;
}

.testimonial .author {
  margin-top: 12px;
  font-size: 14px;
  color: var(--vp-c-text-2);
  font-style: normal;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin: 48px 0;
  text-align: center;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-item h3 {
  font-size: 48px;
  font-weight: 700;
  background: linear-gradient(135deg, #3178c6, #10b981);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.stat-item p {
  margin: 8px 0 0;
  color: var(--vp-c-text-2);
}
</style>

<div class="vp-doc" style="padding: 0 24px; max-width: 1152px; margin: 0 auto;">

<div class="stats-grid">
  <div class="stat-item">
    <h3>70</h3>
    <p>validation rules</p>
  </div>
  <div class="stat-item">
    <h3>5</h3>
    <p>tools replaced</p>
  </div>
  <div class="stat-item">
    <h3>0</h3>
    <p>config required</p>
  </div>
  <div class="stat-item">
    <h3>1</h3>
    <p>command to ship</p>
  </div>
</div>

---

## The Problem

You're publishing a TypeScript library. Your "workflow" looks like this:

```bash
npm run build          # hope tsup config is right
npx publint            # hope exports are valid
npx attw --pack        # hope types resolve
npm version patch      # hope git is clean
npm publish            # hope nothing breaks
```

**Hope is not a strategy.**

Two hours later, someone opens an issue: *"Types aren't working."* Your stomach drops.

---

## The Solution

```bash
npx tspub check --fix    # find problems, fix them
npx tspub publish patch  # build → validate → version → ship
```

That's it. One tool. 70 rules. Auto-fix. Rollback on failure.

---

## What tspub Replaces

<div style="overflow-x: auto;">

| | tspub | publint | attw | tsup | np | changesets |
|:--|:--:|:--:|:--:|:--:|:--:|:--:|
| **Validation rules** | 70 | 40 | 12 | — | — | — |
| **Auto-fix** | ✓ | — | — | — | — | — |
| **Build ESM/CJS** | ✓ | — | — | ✓ | — | — |
| **DTS bundling** | ✓ | — | — | ✓ | — | — |
| **Type checking** | ✓ | — | ✓ | — | — | — |
| **Prereq gates** | ✓ | — | — | — | ✓ | — |
| **Rollback** | ✓ | — | — | — | ✓ | — |
| **Changesets** | ✓ | — | — | — | — | ✓ |
| **Repo scanning** | ✓ | — | — | — | — | — |
| **Diagnostics** | ✓ | — | — | — | — | — |
| **Plugins** | ✓ | — | — | ✓ | — | — |
| **Zero config** | ✓ | ✓ | ✓ | ✓ | — | — |

</div>

---

## Quick Start

::: code-group

```bash [Check your package]
# No install needed
npx tspub check
```

```bash [Fix issues]
npx tspub check --fix
```

```bash [Build]
npx tspub build
```

```bash [Publish]
npx tspub publish patch
```

:::

---

## The Publish Pipeline

```
┌─────────────┐   ┌───────┐   ┌───────┐   ┌──────┐   ┌─────────┐
│ 5 Prereqs   │ → │ Build │ → │ Check │ → │ Bump │ → │ Publish │
└─────────────┘   └───────┘   └───────┘   └──────┘   └─────────┘
      │                                                    │
      ↓                                                    ↓
  Stop early                                         Rollback git
  if not ready                                       if npm fails
```

**The 5 gates:** Clean git tree, correct branch, npm reachable, authenticated, check passes.

**If npm fails:** Git tag removed, version reverted, `package.json` restored. No half-broken releases.

---

## Install

::: code-group

```bash [npm]
npm install -D tspub
```

```bash [pnpm]
pnpm add -D tspub
```

```bash [yarn]
yarn add -D tspub
```

```bash [bun]
bun add -D tspub
```

:::

---

<div class="testimonial">
  <p>"Finally, one tool that catches all the weird edge cases before my users do."</p>
</div>

<div class="testimonial">
  <p>"The auto-fix saved me hours of debugging exports issues."</p>
</div>

<div class="testimonial">
  <p>"Rollback on publish failure is a game changer. No more half-broken releases."</p>
</div>

---

<div style="text-align: center; padding: 48px 0;">

## Ready to stop shipping broken packages?

<a href="/guide/getting-started" class="VPButton medium brand" style="margin-top: 16px;">Get Started →</a>

</div>

</div>
