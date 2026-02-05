import type { PrereqRule } from "../framework/types.js";
import { dirtyTreeRule } from "./dirty-tree.js";
import { branchRule } from "./branch.js";
import { registryPingRule, registryAuthRule } from "./registry.js";
import { checkerPassRule } from "./checker.js";

export const allPrereqs: PrereqRule[] = [
  dirtyTreeRule,
  branchRule,
  registryPingRule,
  registryAuthRule,
  checkerPassRule,
];
