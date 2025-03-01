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

export type LanguageDefinition = {
  wasmPath: string;
  createCFGBuilder: (options: BuilderOptions) => CFGBuilder;
  functionNodeTypes: string[];
};

const typeScriptFunctionNodeTypes = [
  "function_declaration",
  "arrow_function",
  "method_definition",
  "function_expression",
  "generator_function",
  "generator_function_declaration",
];
/*
Some notes:
- We can define the CFG stuff here. Demo, extension, & test code is not relevant.
- After figuring out what belongs here - the code should be moved to the separate
  CFG files. It will still make it much easier to add a new language.
- Extensions & demo & tests should have their language-dependant code bunched
  up in one place as much as possible to make adding languages easier.
 */
export const languageDefinitions: Record<Language, LanguageDefinition> = {
  C: {
    wasmPath: treeSitterC,
    createCFGBuilder: createCCFGBuilder,
    functionNodeTypes: ["function_definition"],
  },
  Go: {
    wasmPath: treeSitterGo,
    createCFGBuilder: createGoCFGBuilder,
    functionNodeTypes: [
      "function_declaration",
      "method_declaration",
      "func_literal",
    ],
  },
  Python: {
    wasmPath: treeSitterPython,
    createCFGBuilder: createPythonCFGBuilder,
    functionNodeTypes: ["function_definition"],
  },
  "C++": {
    wasmPath: treeSitterCpp,
    createCFGBuilder: createCppCFGBuilder,
    functionNodeTypes: cppFunctionNodeNames,
  },
  TypeScript: {
    wasmPath: treeSitterTypeScript,
    createCFGBuilder: createTypeScriptCFGBuilder,
    functionNodeTypes: typeScriptFunctionNodeTypes,
  },
  TSX: {
    wasmPath: treeSitterTSX,
    createCFGBuilder: createTypeScriptCFGBuilder,
    functionNodeTypes: typeScriptFunctionNodeTypes,
  },
};

/**
 * Returns a CFG builder for the given language
 * @param language The language to build for
 * @param options Builder options
 */
export function newCFGBuilder(
  language: Language,
  options: BuilderOptions,
): CFGBuilder {
  return languageDefinitions[language].createCFGBuilder(options);
}
