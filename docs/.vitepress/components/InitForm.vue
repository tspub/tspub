<script setup lang="ts">
import { ref, computed } from "vue";
import FilePreview from "./FilePreview.vue";

const name = ref("my-awesome-lib");
const description = ref("");
const author = ref("");
const dualPublish = ref(false);
const react = ref(false);
const license = ref<"MIT" | "Apache-2.0" | "ISC">("MIT");

const generated = ref(false);
const files = ref<Map<string, string>>(new Map());

// Dynamic imports for scaffold templates (they're pure string functions)
const templates = ref<{
  generatePackageJson: Function;
  generateTsconfig: Function;
  generateIndexTs: Function;
  generateTestTs: Function;
  generateGitignore: Function;
  generateNpmignore: Function;
  generateCiYml: Function;
  generateReadme: Function;
  generateLicense: Function;
  generateChangelog: Function;
} | null>(null);

if (typeof window !== "undefined") {
  Promise.all([
    import("../../../src/scaffold/templates/package.json.js"),
    import("../../../src/scaffold/templates/tsconfig.json.js"),
    import("../../../src/scaffold/templates/index.ts.js"),
    import("../../../src/scaffold/templates/test.ts.js"),
    import("../../../src/scaffold/templates/gitignore.js"),
    import("../../../src/scaffold/templates/npmignore.js"),
    import("../../../src/scaffold/templates/ci.yml.js"),
    import("../../../src/scaffold/templates/readme.js"),
    import("../../../src/scaffold/templates/license.js"),
    import("../../../src/scaffold/templates/changelog.js"),
  ]).then(
    ([
      pkgMod,
      tscMod,
      idxMod,
      testMod,
      giMod,
      niMod,
      ciMod,
      readmeMod,
      licMod,
      clMod,
    ]) => {
      templates.value = {
        generatePackageJson: pkgMod.generatePackageJson,
        generateTsconfig: tscMod.generateTsconfig,
        generateIndexTs: idxMod.generateIndexTs,
        generateTestTs: testMod.generateTestTs,
        generateGitignore: giMod.generateGitignore,
        generateNpmignore: niMod.generateNpmignore,
        generateCiYml: ciMod.generateCiYml,
        generateReadme: readmeMod.generateReadme,
        generateLicense: licMod.generateLicense,
        generateChangelog: clMod.generateChangelog,
      };
    },
  );
}

function generate() {
  if (!templates.value) return;
  const opts = {
    name: name.value,
    description: description.value,
    author: author.value,
    dualPublish: dualPublish.value,
    react: react.value,
    monorepo: false,
    dir: ".",
    license: license.value,
  };

  const f = new Map<string, string>();
  f.set("package.json", templates.value.generatePackageJson(opts));
  f.set("tsconfig.json", templates.value.generateTsconfig(opts));
  f.set("src/index.ts", templates.value.generateIndexTs());
  f.set("test/index.test.ts", templates.value.generateTestTs(opts));
  f.set(".gitignore", templates.value.generateGitignore());
  f.set(".npmignore", templates.value.generateNpmignore());
  f.set(".github/workflows/ci.yml", templates.value.generateCiYml(opts));
  f.set("README.md", templates.value.generateReadme(opts));
  f.set("LICENSE", templates.value.generateLicense(opts));
  f.set("CHANGELOG.md", templates.value.generateChangelog());

  files.value = f;
  generated.value = true;
}
</script>

<template>
  <div>
    <div class="init-form">
      <div class="form-group">
        <label>Package name</label>
        <input v-model="name" type="text" placeholder="my-awesome-lib" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <input
          v-model="description"
          type="text"
          placeholder="A utility library for..."
        />
      </div>
      <div class="form-group">
        <label>Author</label>
        <input v-model="author" type="text" placeholder="Your Name" />
      </div>
      <div class="form-group">
        <label>Module format</label>
        <div class="radio-group">
          <label>
            <input type="radio" :value="false" v-model="dualPublish" />
            ESM only (recommended)
          </label>
          <label>
            <input type="radio" :value="true" v-model="dualPublish" />
            Dual (ESM + CJS)
          </label>
        </div>
      </div>
      <div class="form-group checkbox-group">
        <label>
          <input type="checkbox" v-model="react" />
          React / JSX support
        </label>
      </div>
      <div class="form-group">
        <label>License</label>
        <div class="radio-group">
          <label>
            <input type="radio" value="MIT" v-model="license" />
            MIT
          </label>
          <label>
            <input type="radio" value="Apache-2.0" v-model="license" />
            Apache-2.0
          </label>
          <label>
            <input type="radio" value="ISC" v-model="license" />
            ISC
          </label>
        </div>
      </div>
      <button class="btn btn-primary" @click="generate" :disabled="!templates">
        Generate
      </button>
    </div>

    <FilePreview v-if="generated" :files="files" :pkg-name="name" />

    <div
      v-if="generated"
      style="
        margin-top: 16px;
        padding: 12px 16px;
        background: var(--vp-c-bg-soft);
        border-radius: 6px;
        border-left: 3px solid var(--vp-c-brand-1);
        font-size: 14px;
      "
    >
      Or run in your terminal:
      <code style="display: block; margin-top: 8px; font-size: 13px">
        npx tspub init {{ name }}{{ dualPublish ? " --cjs" : "" }}{{ react ? " --react" : "" }}
      </code>
    </div>
  </div>
</template>
