export function generateNpmignore(): string {
  return `src/
test/
tsconfig.json
.github/
.gitignore
vitest.config.ts
coverage/
*.tsbuildinfo
`;
}
