import type { Node as SyntaxNode } from "web-tree-sitter";
import type { Language } from "./cfg";
import { extractCFunctionName } from "./cfg-c.ts";
import { extractCppFunctionName } from "./cfg-cpp.ts";
import { extractGoFunctionName } from "./cfg-go.ts";
import { extractPythonFunctionName } from "./cfg-python.ts";
import { extractTypeScriptFunctionName } from "./cfg-typescript.ts";

// ADD-LANGUAGES-HERE
/**
 * Mapping of languages to their function name extraction functions.
 * This ensures all supported languages have extractors via TypeScript typing.
 */
const functionNameExtractors: Record<
  Language,
  (func: SyntaxNode) => string | undefined
> = {
  TypeScript: extractTypeScriptFunctionName,
  TSX: extractTypeScriptFunctionName,
  C: extractCFunctionName,
  "C++": extractCppFunctionName,
  Python: extractPythonFunctionName,
  Go: extractGoFunctionName,
} as const;

/**
 * Extracts the name of a function based on its syntax node and language.
 *
 * Supports all languages defined in the Language type:
 * - TypeScript/TSX
 * - C
 * - C++
 * - Python
 * - Go
 *
 * @param func - The syntax node (The function).
 * @param language - The programming language of the function.
 */
export function extractFunctionName(
  func: SyntaxNode,
  language: Language,
): string | undefined {
  const extractor = functionNameExtractors[language];
  return extractor(func);
}
