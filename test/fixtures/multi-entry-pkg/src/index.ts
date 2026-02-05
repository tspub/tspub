import { shared } from "./shared.js";

export function hello(): string {
  return shared("world");
}

export default hello;
