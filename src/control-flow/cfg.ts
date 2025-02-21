import { createCFGBuilder as createCCFGBuilder } from "./cfg-c";
import {
  functionNodeNames as cppFunctionNodeNames,
  createCFGBuilder as createCppCFGBuilder,
} from "./cfg-cpp";
import type { BuilderOptions, CFGBuilder } from "./cfg-defs";
import { createCFGBuilder as createGoCFGBuilder } from "./cfg-go";
import { createCFGBuilder as createPythonCFGBuilder } from "./cfg-python";
import { createCFGBuilder as createTypeScriptCFGBuilder } from "./cfg-typescript.ts";

import treeSitterC from "../../parsers/tree-sitter-c.wasm?url";
import treeSitterCpp from "../../parsers/tree-sitter-cpp.wasm?url";
import treeSitterGo from "../../parsers/tree-sitter-go.wasm?url";
import treeSitterPython from "../../parsers/tree-sitter-python.wasm?url";
import treeSitterTSX from "../../parsers/tree-sitter-tsx.wasm?url";
import treeSitterTypeScript from "../../parsers/tree-sitter-typescript.wasm?url";

// ADD-LANGUAGES-HERE
/**
 * The languages we support
 */
export const supportedLanguages = [
  "C",
  "Go",
  "Python",
  "C++",
  "TypeScript",
  "TSX",
] as const;
export type Language = (typeof supportedLanguages)[number];
export function isValidLanguage(language: string): language is Language {
  return (supportedLanguages as readonly string[]).includes(language);
}

export type LanguageDefinition = {wasmPath:string};
export const languageDefinitions:Record<Language, LanguageDefinition> = {
  "C":{wasmPath:treeSitterC},
  "Go":{wasmPath:treeSitterGo},
  "Python":{wasmPath:treeSitterPython},
  "C++":{wasmPath:treeSitterCpp},
  "TypeScript":{wasmPath:treeSitterTypeScript},
  "TSX":{wasmPath:treeSitterTSX},
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
    case "TypeScript":
      return createTypeScriptCFGBuilder(options);
    case "TSX":
      return createTypeScriptCFGBuilder(options);
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
  TypeScript: [
    "function_declaration",
    "arrow_function",
    "method_definition",
    "function_expression",
    "generator_function",
    "generator_function_declaration",
  ],
  // We copy the TypeScript values here
  TSX: [],
};

functionNodeTypes.TSX = functionNodeTypes.TypeScript;
