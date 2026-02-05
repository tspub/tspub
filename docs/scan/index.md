# Scan

The `tspub scan` command clones GitHub repositories and runs the full checker against them. Great for auditing dependencies or doing ecosystem research.

## Quick Start

```bash
# Scan a specific repo
tspub scan https://github.com/user/repo

# Scan top TypeScript repos
tspub scan --top 20
```

## Scan a Repository

```bash
tspub scan https://github.com/lodash/lodash
```

Output:
```
Cloning lodash/lodash...
Running checker on 1 package...

lodash
  exports/types-order      "types" should be first
  metadata/engines         missing engines field

1 package scanned
2 issues found
```

## Scan Top Repos

Scan the most popular TypeScript repositories on GitHub:

```bash
tspub scan --top 20                    # Top 20 repos
tspub scan --top 50 --concurrency 5    # Parallel scanning
tspub scan --min-stars 1000            # Minimum star count
```

## Options

| Option | Description |
|:-------|:------------|
| `--top <n>` | Scan top N TypeScript repos |
| `--concurrency <n>` | Parallel clone/check (default: 3) |
| `--min-stars <n>` | Minimum GitHub stars |
| `--query <q>` | Custom GitHub search query |
| `--profile <name>` | Checker profile (`strict`, `exports-only`, `types-only`) |
| `--report <path>` | Save markdown report to file |
| `--json` | Output JSON |
| `--rule <id=severity>` | Override rule severity |

## Profiles

Focus on specific rule categories:

```bash
tspub scan --top 20 --profile exports-only   # Only exports rules
tspub scan --top 20 --profile types-only     # Only types rules
tspub scan --top 20 --profile strict         # All rules (default)
```

## Generate Reports

Save a markdown report:

```bash
tspub scan --top 50 --report ecosystem-report.md
```

The report includes:
- Summary statistics
- Issues by category
- Top issues across repos
- Per-repo breakdown

## JSON Output

For CI/automation:

```bash
tspub scan https://github.com/user/repo --json
```

```json
{
  "repo": "user/repo",
  "packages": [
    {
      "name": "my-package",
      "path": ".",
      "issues": [
        { "ruleId": "exports/types-order", "severity": "error", "message": "..." }
      ]
    }
  ],
  "timing": { "cloneMs": 1234, "checkMs": 567 }
}
```

## Use Cases

### Audit a Dependency

Before adding a new dependency:

```bash
tspub scan https://github.com/author/package
```

Check if it has packaging issues that might affect your project.

### Ecosystem Research

See how the top repos are doing:

```bash
tspub scan --top 100 --report research.md --concurrency 10
```

### Find Examples

Find repos that pass all checks for reference:

```bash
tspub scan --top 50 --json | jq '.[] | select(.packages[0].issues | length == 0)'
```

## Configuration

```ts
// tspub.config.ts
export default {
  scan: {
    concurrency: 5,
    profile: "strict",
    severityOverrides: {
      "size/package-size": "off",  // Don't care about size
    },
  },
};
```

## Programmatic API

```ts
import { scan } from "tspub";

const results = await scan({
  url: "https://github.com/user/repo",
  json: true,
});

// Or scan top repos
const topResults = await scan({
  top: 20,
  concurrency: 5,
  profile: "exports-only",
});
```
