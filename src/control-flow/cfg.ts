import type { Node as SyntaxNode } from "web-tree-sitter";
import { cLanguageDefinition } from "./cfg-c";
import { cppLanguageDefinition } from "./cfg-cpp";
import { csharpLanguageDefinition } from "./cfg-csharp";
import type { BuilderOptions, CFGBuilder } from "./cfg-defs";
import { goLanguageDefinition } from "./cfg-go";
import { javaLanguageDefinition } from "./cfg-java";
import { pythonLanguageDefinition } from "./cfg-python";
import {
  tsxLanguageDefinition,
  typeScriptLanguageDefinition,
} from "./cfg-typescript.ts";

// ADD-LANGUAGES-HERE
/**
 * The languages we support
 */
export const supportedLanguages = [
  "C",
  "C#",
  "Go",
  "Java",
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
  /** Load path for the tree-sitter language WASM file */
  wasmPath: string;
  /** Language CFGBuilder factory */
  createCFGBuilder: (options: BuilderOptions) => CFGBuilder;
  /** All AST nodes types representing functions */
  functionNodeTypes: string[];
  /** Extract the function name from a function node */
  extractFunctionName: (node: SyntaxNode) => string | undefined;
};

export const languageDefinitions: Record<Language, LanguageDefinition> = {
  C: cLanguageDefinition,
  "C#": csharpLanguageDefinition,
  Go: goLanguageDefinition,
  Java: javaLanguageDefinition,
  Python: pythonLanguageDefinition,
  "C++": cppLanguageDefinition,
  TypeScript: typeScriptLanguageDefinition,
  TSX: tsxLanguageDefinition,
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

export function extractFunctionName(
  language: Language,
  func: SyntaxNode,
): string | undefined {
  return languageDefinitions[language].extractFunctionName(func);
}
