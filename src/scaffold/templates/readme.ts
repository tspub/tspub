import type { ScaffoldOptions } from "../index.js";

export function generateReadme(options: ScaffoldOptions): string {
  const author = options.author ?? "USERNAME";
  return `# ${options.name}

[![CI](https://github.com/${author}/${options.name}/actions/workflows/ci.yml/badge.svg)](https://github.com/${author}/${options.name}/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/${options.name})](https://www.npmjs.com/package/${options.name})

${options.description ? options.description + "\n" : ""}
## Install

\`\`\`bash
npm install ${options.name}
\`\`\`

## Usage

\`\`\`typescript
import { greet } from "${options.name}";

console.log(greet("World"));
\`\`\`

## Development

\`\`\`bash
npm install
npm run build
npm test
\`\`\`

## License

${options.license ?? "MIT"}
`;
}
