import { createCFGBuilder as createCCFGBuilder } from "./cfg-c";
import type { BuilderOptions, CFGBuilder } from "./cfg-defs";
import { createCFGBuilder as createGoCFGBuilder } from "./cfg-go";
import { createCFGBuilder as createPythonCFGBuilder } from "./cfg-python";
import {
  createCFGBuilder as createCppCFGBuilder,
  functionNodeNames as cppFunctionNodeNames,
} from "./cfg-cpp";

export const supportedLanguages = ["C", "Go", "Python", "C++"] as const;
export type Language = (typeof supportedLanguages)[number];
export function isValidLanguage(language: string): language is Language {
  return (supportedLanguages as readonly string[]).includes(language);
}

export function newCFGBuilder(
  language: Language,
  options: BuilderOptions,
): CFGBuilder {
  switch (language) {
    case "C":
      return createCCFGBuilder(options);
    case "Go":
      return createGoCFGBuilder(options);
    case "Python":
      return createPythonCFGBuilder(options);
    case "C++":
      return createCppCFGBuilder(options);
  }
}

export const functionNodeTypes: { [language in Language]: string[] } = {
  Go: ["function_declaration", "method_declaration", "func_literal"],
  C: ["function_definition"],
  "C++": cppFunctionNodeNames,
  Python: ["function_definition"],
};
