export function generateIndexTs(): string {
  return `/**
 * Add your package exports here.
 */

export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
`;
}
