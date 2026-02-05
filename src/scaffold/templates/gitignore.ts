export function generateGitignore(): string {
  return `node_modules/
dist/
*.tsbuildinfo
.env
.env.*
coverage/
`;
}
