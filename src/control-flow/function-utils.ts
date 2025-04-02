import type { Node as SyntaxNode } from "web-tree-sitter";
import { type Language, languageDefinitions } from "./cfg";

function extractNameByString(func: SyntaxNode, type: string): string | null {
  return (
    func.namedChildren.find((child) => child && child.type === type)?.text ||
    null
  );
}

function extractVariableName(func: SyntaxNode, type: string): string | null {
  let parent = func.parent;
  while (parent) {
    if (parent.type === type) {
      return extractNameByString(parent, "identifier");
    }
    parent = parent.parent;
  }
  return null;
}

function extractGoFunctionName(func: SyntaxNode): string | null {
  switch (func.type) {
    case "function_declaration":
    case "method_declaration":
      return extractNameByString(func, "identifier");
    case "func_literal": {
      return extractVariableName(func, "variable_declaration");
    }
    default:
      return null;
  }
}

function extractTypeScriptFunctionName(func: SyntaxNode): string | null {
  const funcNodeTypes = languageDefinitions.TypeScript.functionNodeTypes;
  switch (func.type) {
    case funcNodeTypes[0]: // "function_declaration"
    case funcNodeTypes[4]: // "generator_function"
    case funcNodeTypes[5]: // "generator_function_declaration"
      return extractNameByString(func, "identifier");

    case funcNodeTypes[1]: // "arrow_function"
      return extractVariableName(func, "variable_declarator");

    case funcNodeTypes[2]: // "method_definition"
      return extractNameByString(func, "property_identifier");

    case funcNodeTypes[3]: /*"function_expression"*/ {
      // Check if the function itself has a name
      const optionalIdentifier = extractNameByString(func, "identifier");
      if (optionalIdentifier) {
        return optionalIdentifier;
      }
      // If not, check if it's part of a variable declaration
      return extractVariableName(func, "variable_declarator");
    }
    default:
      return null;
  }
}

export function extractFunctionName(
  func: SyntaxNode,
  language: Language,
): string | null {
  switch (language) {
    case "TypeScript":
    case "TSX":
      return extractTypeScriptFunctionName(func);

    case "C":
    case "C++":
      if (func.type === "function_definition") {
        return func.descendantsOfType("identifier")[0]?.text || null;
      }
      if (func.type === "lambda_expression" && language === "C++") {
        // if the lambda is assigned to a variable, return the variable name
        // otherwise return "Lambda Expression (Anonymous)"
        return (
          extractVariableName(func, "variable_declaration") ||
          extractVariableName(func, "init_declarator") ||
          "Lambda Expression (Anonymous)"
        );
      }
      return null;

    case "Python":
      if (func.type === "function_definition") {
        return extractNameByString(func, "identifier");
      }
      return null;

    case "Go":
      return extractGoFunctionName(func);

    default:
      return null;
  }
}
