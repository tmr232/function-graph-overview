import type { Node as SyntaxNode } from "web-tree-sitter";
import { type Language, languageDefinitions } from "./cfg";

const nodeType = {
  // Common Node Types
  identifier: "identifier",
  fieldIdentifier: "field_identifier",
  shortVarDeclaration: "short_var_declaration",
  assignment: "assignment",
  declaration: "declaration",
  expressionList: "expression_list",
  identifierList: "identifier_list",

  // Declaration-Related Node Types
  variableDeclaration: "variable_declaration",
  initDeclarator: "init_declarator",

  // Variable & Property Identifiers
  variableDeclarator: "variable_declarator",
  propertyIdentifier: "property_identifier",

  // C++-Specific Node Types
  lambdaExpression: "lambda_expression",
};

//Maps each supported programming language to its relevant function node types
const functionType = {
  TypeScript: {
    functionDeclaration: languageDefinitions.TypeScript.functionNodeTypes[0],
    arrowFunction: languageDefinitions.TypeScript.functionNodeTypes[1],
    methodDefinition: languageDefinitions.TypeScript.functionNodeTypes[2],
    functionExpression: languageDefinitions.TypeScript.functionNodeTypes[3],
    generatorFunction: languageDefinitions.TypeScript.functionNodeTypes[4],
    generatorFunctionDeclaration:
      languageDefinitions.TypeScript.functionNodeTypes[5],
  },
  C: {
    functionDefinition: languageDefinitions.C.functionNodeTypes[0],
  },
  "C++": {
    functionDefinition: languageDefinitions["C++"].functionNodeTypes[0],
    lambdaExpression: languageDefinitions["C++"].functionNodeTypes[1],
  },
  Go: {
    functionDeclaration: languageDefinitions.Go.functionNodeTypes[0],
    methodDeclaration: languageDefinitions.Go.functionNodeTypes[1],
    funcLiteral: languageDefinitions.Go.functionNodeTypes[2],
  },
  Python: {
    functionDefinition: languageDefinitions.Python.functionNodeTypes[0],
  },
};

/**
 * Extracts the name of a node by searching for a child node with a specific type.
 *
 * @param {SyntaxNode} func - The syntax node to search within.
 * @param {string} type - The type of the child node to extract the name from.
 * @returns {string | undefined} The name of the node, or `undefined` if not found.
 */
function extractNameByNodeName(
  func: SyntaxNode,
  type: string,
): string | undefined {
  return (
    func.namedChildren.find((child) => child && child.type === type)?.text ||
    undefined
  );
}

/**
 * Extracts the name of a variable to which a function is assigned.
 * This function traverses the syntax tree upwards to locate the variable name.
 *
 * @param {SyntaxNode} func - The syntax node representing the function.
 * @param {string} parentType - The type of the parent node to search for.
 * @param {string} childType - The type of the child node to extract the variable name from.
 * @returns {string | undefined} The variable name, or `undefined` if not found.
 */
function extractVariableName(
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
 * Extracts the name of a Go function based on its syntax node type.
 *
 * @param {SyntaxNode} func - The syntax node representing the Go function.
 * @returns {string | undefined} The function name, or `undefined` if not found.
 */
function extractGoFunctionName(func: SyntaxNode): string | undefined {
  switch (func.type) {
    case functionType.Go.functionDeclaration:
      return extractNameByNodeName(func, nodeType.identifier);
    case functionType.Go.methodDeclaration:
      return extractNameByNodeName(func, nodeType.fieldIdentifier);
    case functionType.Go.funcLiteral: {
      // Check if the func_literal is assigned to a variable
      const variable =
        extractVariableName(
          func,
          nodeType.shortVarDeclaration,
          nodeType.expressionList,
        ) || // x := func() {}
        extractVariableName(
          func,
          nodeType.assignment,
          nodeType.expressionList,
        ) || // x = func() {}
        extractVariableName(
          func,
          nodeType.declaration,
          nodeType.identifierList,
        ); // var x = func() {}

      if (variable) {
        return variable;
      }

      // If no variable is found it is probably an anonymous function
      return "<Anonymous>";
    }
    default:
      return undefined;
  }
}
/**
 * Extracts the name of a TypeScript function based on its syntax node type.
 *
 * @param {SyntaxNode} func - The syntax node representing the TypeScript function.
 * @returns {string | undefined} The function name, or `undefined` if not found.
 */
function extractTypeScriptFunctionName(func: SyntaxNode): string | undefined {
  switch (func.type) {
    case functionType.TypeScript.functionDeclaration:
    case functionType.TypeScript.generatorFunctionDeclaration:
      return extractNameByNodeName(func, nodeType.identifier);

    case functionType.TypeScript.generatorFunction:
    case functionType.TypeScript.arrowFunction:
      return (
        extractVariableName(
          func,
          nodeType.variableDeclarator,
          nodeType.identifier,
        ) || "<Anonymous>"
      );

    case functionType.TypeScript.methodDefinition:
      return extractNameByNodeName(func, nodeType.propertyIdentifier);

    case functionType.TypeScript.functionExpression: {
      // Check if the function itself has a name
      const optionalIdentifier = extractNameByNodeName(
        func,
        nodeType.identifier,
      );
      if (optionalIdentifier) {
        return optionalIdentifier;
      }
      // If not, check if it's part of a variable declaration
      return (
        extractVariableName(
          func,
          nodeType.variableDeclarator,
          nodeType.identifier,
        ) || "<Anonymous>"
      );
    }
    default:
      return undefined;
  }
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
 * @param {SyntaxNode} func - The syntax node (The function).
 * @param {Language} language - The programming language of the function.
 * @returns {string | undefined} The function name, or `undefined` if not found.
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
    case "C++":
      if (func.type === functionType.C.functionDefinition) {
        return (
          func.descendantsOfType(nodeType.identifier)[0]?.text || undefined
        );
      }
      if (
        func.type === functionType["C++"].lambdaExpression &&
        language === "C++"
      ) {
        // if the lambda is assigned to a variable, return the variable name
        // otherwise return "Anonymous"
        return (
          extractVariableName(
            func,
            nodeType.variableDeclaration,
            nodeType.identifier,
          ) ||
          extractVariableName(
            func,
            nodeType.initDeclarator,
            nodeType.identifier,
          ) ||
          "<Anonymous>"
        );
      }
      return undefined;

    case "Python":
      if (func.type === functionType.Python.functionDefinition) {
        return extractNameByNodeName(func, nodeType.identifier);
      }
      return undefined;

    case "Go":
      return extractGoFunctionName(func);

    default:
      return undefined;
  }
}
