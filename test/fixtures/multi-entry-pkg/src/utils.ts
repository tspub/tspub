import { shared } from "./shared.js";

export function format(name: string): string {
  return shared(name).toUpperCase();
}
