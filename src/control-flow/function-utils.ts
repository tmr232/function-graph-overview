import { Query, type Node as SyntaxNode } from "web-tree-sitter";
import type { Language } from "./cfg";
import { extractCFunctionName } from "./cfg-c.ts";
import { extractCppFunctionName } from "./cfg-cpp.ts";
import { extractGoFunctionName } from "./cfg-go.ts";
import { extractPythonFunctionName } from "./cfg-python.ts";
import { extractTypeScriptFunctionName } from "./cfg-typescript.ts";

/**
 * ********************Will probably be removed.********************
 *
 * Extracts the name of a node by searching for a child node with a specific type.
 *
 * @param func - The syntax node to search within.
 * @param type - The type of the child node to extract the name from.
 *
 * used among all languages (mostly the easy cases of extracting the name).
 *
 */
export function extractNameByNodeType(
  func: SyntaxNode,
  type: string,
): string | undefined {
  return func.namedChildren.find((child) => child?.type === type)?.text;
}

/**
 * Extract a single tagged value from a syntax tree using a Tree-sitter query.
 *
 * @param func - The syntax node from which to extract the tree.
 * @param query - The Tree-sitter query string to execute.
 * @param tag - The capture tag name to filter by.
 */
export function extractTaggedValueFromTreeSitterQuery(
  func: SyntaxNode,
  query: string,
  tag: string,
): string[] {
  const queryObj = new Query(func.tree.language, query);
  const captures = queryObj.captures(func, { maxStartDepth: 1 });
  return captures
    .filter((c) => c.name === tag && c.node.text)
    .map((c) => {
      return c.node.text;
    });
}

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
