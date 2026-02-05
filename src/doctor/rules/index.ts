import type { DoctorRule } from "../framework/types.js";
import { environmentRules } from "./environment.js";
import { typescriptRules } from "./typescript.js";
import { buildRules } from "./build.js";
import { dependencyRules } from "./dependencies.js";

export const allDoctorRules: DoctorRule[] = [
  ...environmentRules,
  ...typescriptRules,
  ...buildRules,
  ...dependencyRules,
];
