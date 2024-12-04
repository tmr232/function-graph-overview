import { createCFGBuilder as createCCFGBuilder } from "./cfg-c";
import {
  functionNodeNames as cppFunctionNodeNames,
  createCFGBuilder as createCppCFGBuilder,
} from "./cfg-cpp";
import type { BuilderOptions, CFGBuilder } from "./cfg-defs";
import { createCFGBuilder as createGoCFGBuilder } from "./cfg-go";
import { createCFGBuilder as createPythonCFGBuilder } from "./cfg-python";

// ADD-LANGUAGES-HERE
/**
 * The languages we support
 */
export const supportedLanguages = ["C", "Go", "Python", "C++"] as const;
export type Language = (typeof supportedLanguages)[number];
export function isValidLanguage(language: string): language is Language {
  return (supportedLanguages as readonly string[]).includes(language);
}

/**
 * Returns a CFG builder for the given language
 * @param language The language to build for
 * @param options Builder options
 */
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

/**
 * The names of the AST nodes representing functions in each language
 */
export const functionNodeTypes: { [language in Language]: string[] } = {
  Go: ["function_declaration", "method_declaration", "func_literal"],
  C: ["function_definition"],
  "C++": cppFunctionNodeNames,
  Python: ["function_definition"],
};
