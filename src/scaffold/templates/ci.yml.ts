import type { ScaffoldOptions } from "../index.js";

export function generateCiYml(options: ScaffoldOptions): string {
  const nodeVersion = options.nodeVersion ?? 22;
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${nodeVersion}
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test -- --run
      - run: npx @tspub-dev/tspub check
`;
}
