import { Query, type Node as SyntaxNode } from "web-tree-sitter";
import type { Language } from "./cfg";
import { extractCFunctionName } from "./cfg-c.ts";
import { extractCppFunctionName } from "./cfg-cpp.ts";
import { extractGoFunctionName } from "./cfg-go.ts";
import { extractPythonFunctionName } from "./cfg-python.ts";
import { extractTypeScriptFunctionName } from "./cfg-typescript.ts";

/**
 * Extracts the name of a node by searching for a child node with a specific type.
 *
 * @param func - The syntax node to search within.
 * @param type - The type of the child node to extract the name from.
 * used among all languages (mostly the easy cases of extracting the name).
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
): string | undefined {
  const language = func.tree.language;
  const queryObj = new Query(language, query);

  const rootNode = func.tree.rootNode;
  const captures = queryObj.captures(rootNode);

  const names = captures
    .filter((c) => c.name === tag && c.node.text)
    .map((c) => c.node.text);

  if (names.length > 1) {
    return "<unsupported>";
  }
  return names[0]; // can (and sometimes will) be undefined
}

/**
 * Extracts the name of a function based on its syntax node and language.
 *
 * Supports:
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
  switch (language) {
    case "TypeScript":
    case "TSX":
      return extractTypeScriptFunctionName(func);
    case "C":
      return extractCFunctionName(func);
    case "C++":
      return extractCppFunctionName(func);
    case "Python":
      return extractPythonFunctionName(func);
    case "Go":
      return extractGoFunctionName(func);
    default:
      return undefined;
  }
}
