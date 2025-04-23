import type { Node as SyntaxNode } from "web-tree-sitter";
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
 */
export function extractNameByNodeName(
  func: SyntaxNode,
  type: string,
): string | undefined {
  return func.namedChildren.find((child) => child?.type === type)?.text;
}

/**
 * Extracts the name of a variable to which a function is assigned.
 * This function traverses the syntax tree upwards to locate the variable name.
 *
 * @param func - The syntax node representing the function.
 * @param parentType - The type of the parent node to search for.
 * @param childType - The type of the child node to extract the variable name from.
 */
export function findNameInParentHierarchy(
  func: SyntaxNode,
  parentType: string,
  childType: string,
): string | undefined {
  let parent = func.parent;
  while (parent) {
    if (parent.type === parentType) {
      return extractNameByNodeName(parent, childType);
    }
    parent = parent.parent;
  }
  return undefined;
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
