import { createCFGBuilder as createCCFGBuilder } from "./cfg-c";
import type { BuilderOptions, CFGBuilder } from "./cfg-defs";
import { CFGBuilder as CFGBuilderForGo } from "./cfg-go";
import { createCFGBuilder as createPythonCFGBuilder } from "./cfg-python";

export type Language = "C" | "Go" | "Python";

export function newCFGBuilder(
  language: Language,
  options: BuilderOptions,
): CFGBuilder {
  switch (language) {
    case "C":
      return createCCFGBuilder(options);
    case "Go":
      return new CFGBuilderForGo(options);
    case "Python":
      return createPythonCFGBuilder(options);
  }
}
