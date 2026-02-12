import type { TspubConfig } from "tspub";

export default {
  check: {
    plugins: ["./tspub-plugin-no-barrel.js"],
  },
} satisfies TspubConfig;
