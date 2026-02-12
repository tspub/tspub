import type { TspubConfig } from "tspub";

/**
 * Example tspub configuration.
 *
 * Place this file as `tspub.config.ts` in your project root.
 * All fields are optional — tspub works with zero config.
 */
export default {
  // Build options (passed to esbuild under the hood)
  build: {
    // Output formats — default: ["esm"]
    formats: ["esm", "cjs"],

    // Entry point(s) — auto-detected from package.json if omitted
    entry: "src/index.ts",

    // Output directory — default: "dist"
    outDir: "dist",

    // Generate .d.ts declaration files — default: true
    dts: true,

    // Generate sourcemaps — default: false
    sourcemap: true,

    // Clean output directory before build — default: true
    clean: true,
  },

  // Checker options (tspub check)
  check: {
    // Override severity for specific rules
    severityOverrides: {
      // Downgrade to warning
      "size/package-size": "warning",

      // Disable entirely
      "metadata/engines": "off",

      // Upgrade to error
      "files/bin-shebang": "error",
    },

    // Load custom checker plugins
    plugins: [
      // npm package
      // "tspub-plugin-my-rules",

      // Local file
      // "./tools/custom-rules.js",
    ],

    // Type test integration
    typeTests: {
      enabled: true,
      directory: "test-d",
    },
  },

  // Publish options (tspub publish)
  publish: {
    // npm registry URL
    registry: "https://registry.npmjs.org",

    // Package access level
    access: "public",

    // Enable npm provenance (requires supported CI)
    provenance: true,

    // Only allow publishing from these branches
    branch: ["main", "release/*"],

    // Changelog generation style
    changelogStyle: "conventional",

    // CI-specific options
    ci: {
      enabled: true,
      skipPush: false,
    },
  },

  // Changeset options (tspub changeset)
  changeset: {
    // How to bump dependents: "major" | "all" | "none"
    dependentBumping: "major",

    // Tag for snapshot releases
    snapshotTag: "canary",
  },
} satisfies TspubConfig;
