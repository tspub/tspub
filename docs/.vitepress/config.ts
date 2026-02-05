import { defineConfig } from "vitepress";

export default defineConfig({
  title: "tspub",
  description:
    "The unified TypeScript package toolkit — init, build, check, publish in one tool",
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/logo.svg" }],
    ["meta", { name: "theme-color", content: "#0ea5e9" }],
    [
      "meta",
      {
        property: "og:title",
        content: "tspub — The unified TypeScript package toolkit",
      },
    ],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Init, build, check, and publish TypeScript packages with one tool. 60 lint rules, changeset versioning, type testing, and more.",
      },
    ],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
  ],
  cleanUrls: true,
  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "tspub",
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      {
        text: "Commands",
        items: [
          { text: "Check", link: "/check/" },
          { text: "Build", link: "/build/" },
          { text: "Publish", link: "/publish/" },
          { text: "Doctor", link: "/doctor/" },
          { text: "Scan", link: "/scan/" },
          { text: "Changeset", link: "/changeset/" },
        ],
      },
      { text: "Config", link: "/config/" },
      { text: "API", link: "/api/" },
      { text: "Playground", link: "/playground" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "Why tspub?", link: "/guide/why-tspub" },
            { text: "CI Integration", link: "/guide/ci-integration" },
          ],
        },
        {
          text: "Migration",
          items: [
            { text: "From tsup", link: "/guide/migration/from-tsup" },
            {
              text: "From @changesets/cli",
              link: "/guide/migration/from-changesets",
            },
            { text: "From Manual Setup", link: "/guide/migration/from-manual" },
          ],
        },
      ],
      "/check/": [
        {
          text: "Checker",
          items: [
            { text: "Overview", link: "/check/" },
            { text: "Profiles", link: "/check/profiles" },
            { text: "Plugins", link: "/check/plugins" },
          ],
        },
        {
          text: "Rules",
          items: [
            { text: "All Rules", link: "/check/rules/" },
            { text: "exports", link: "/check/rules/exports/" },
            { text: "types", link: "/check/rules/types/" },
            { text: "files", link: "/check/rules/files/" },
            { text: "metadata", link: "/check/rules/metadata/" },
            { text: "size", link: "/check/rules/size/" },
          ],
        },
      ],
      "/build/": [
        {
          text: "Build",
          items: [
            { text: "Overview", link: "/build/" },
            { text: "Options", link: "/build/options" },
          ],
        },
        {
          text: "Recipes",
          items: [
            { text: "React Library", link: "/build/recipes/react" },
            { text: "Vue Library", link: "/build/recipes/vue" },
            { text: "Node CLI", link: "/build/recipes/node-cli" },
          ],
        },
      ],
      "/changeset/": [
        {
          text: "Changesets",
          items: [
            { text: "Overview", link: "/changeset/" },
            { text: "Adding Changesets", link: "/changeset/adding-changesets" },
            { text: "Versioning", link: "/changeset/versioning" },
          ],
        },
      ],
      "/type-test/": [
        {
          text: "Type Testing",
          items: [
            { text: "Overview", link: "/type-test/" },
            { text: "Writing Tests", link: "/type-test/writing-tests" },
          ],
        },
      ],
      "/publish/": [
        {
          text: "Publishing",
          items: [
            { text: "Overview", link: "/publish/" },
            { text: "CI Workflow", link: "/publish/ci-workflow" },
          ],
        },
      ],
      "/doctor/": [
        {
          text: "Doctor",
          items: [
            { text: "Overview", link: "/doctor/" },
          ],
        },
      ],
      "/scan/": [
        {
          text: "Scan",
          items: [
            { text: "Overview", link: "/scan/" },
          ],
        },
      ],
      "/config/": [
        {
          text: "Configuration",
          items: [{ text: "Reference", link: "/config/" }],
        },
      ],
      "/api/": [
        {
          text: "API",
          items: [{ text: "Programmatic API", link: "/api/" }],
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/anishgiri/tspub" },
      { icon: "npm", link: "https://www.npmjs.com/package/tspub" },
    ],
    editLink: {
      pattern: "https://github.com/anishgiri/tspub/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
    search: {
      provider: "local",
    },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright 2024-present Anish Giri",
    },
  },
});
