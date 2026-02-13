# CI Publish Workflow

## GitHub Actions

```yaml
name: Publish
on:
  push:
    branches: [main]

permissions:
  contents: write
  id-token: write  # For npm provenance

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for changelog

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org

      - run: npm ci
      - run: npx @tspub-dev/tspub changeset version
      - run: npx @tspub-dev/tspub publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Provenance

tspub supports [npm provenance](https://docs.npmjs.com/generating-provenance-statements) when publishing from GitHub Actions:

```typescript
export default {
  publish: {
    provenance: true,
  },
};
```

This adds a verified "Published from GitHub Actions" badge on npmjs.com.

## Snapshot Releases from PRs

```yaml
name: Snapshot
on: pull_request

jobs:
  snapshot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npx @tspub-dev/tspub changeset snapshot --tag pr-${{ github.event.number }}
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
