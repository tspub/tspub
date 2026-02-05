import { add } from "./utils.js";

export function greet(name: string): string {
  return `Hello, ${name}!`;
}

export default function sum(a: number, b: number): number {
  return add(a, b);
}
