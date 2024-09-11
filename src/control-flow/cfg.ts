import { CFGBuilder as CFGBuilderForC } from "./cfg-c";
import type { BuilderOptions, CFGBuilder } from "./cfg-defs";
import { CFGBuilder as CFGBuilderForGo } from "./cfg-go";
import { CFGBuilder as CFGBuilderForPython } from "./cfg-python";

export type Language = "C" | "Go" | "Python";

export function newCFGBuilder(
  language: Language,
  options: BuilderOptions,
): CFGBuilder {
  switch (language) {
    case "C":
      return new CFGBuilderForC(options);
    case "Go":
      return new CFGBuilderForGo(options);
    case "Python":
      return new CFGBuilderForPython(options);
  }
}
