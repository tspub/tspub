# Playground

::: tip Coming Soon
The interactive playground is under development. It will let you paste a `package.json` and see tspub's 60 rules applied instantly — like [publint.dev](https://publint.dev) but with more rules and auto-fix suggestions.
:::

## Try it Locally

In the meantime, you can check any package from your terminal:

```bash
# Check your package
npx tspub check

# Check with JSON output
npx tspub check --format json

# Check with resolution table
npx tspub check --format table

# List all rules
npx tspub check --list-rules
```

## Scan Any npm Package

```bash
# Scan a GitHub repo
npx tspub scan https://github.com/sindresorhus/chalk

# Scan top npm packages
npx tspub scan --top 10
```
