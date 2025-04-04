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

function extractNameByNodeName(
  func: SyntaxNode,
  type: string,
): string | undefined {
  return (
    func.namedChildren.find((child) => child && child.type === type)?.text ||
    undefined
  );
}

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
      return "Anonymous Function (func literal)";
    }
    default:
      return undefined;
  }
}

function extractTypeScriptFunctionName(func: SyntaxNode): string | undefined {
  console.log(func.type);
  console.log(func);
  switch (func.type) {
    case functionType.TypeScript.functionDeclaration:
    case functionType.TypeScript.generatorFunctionDeclaration:
      return extractNameByNodeName(func, nodeType.identifier);

    case functionType.TypeScript.generatorFunction:
    case functionType.TypeScript.arrowFunction:
      return extractVariableName(
        func,
        nodeType.variableDeclarator,
        nodeType.identifier,
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
      return extractVariableName(
        func,
        nodeType.variableDeclarator,
        nodeType.identifier,
      );
    }
    default:
      return undefined;
  }
}

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
        // otherwise return "Lambda Expression (Anonymous)"
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
          "Lambda Expression (Anonymous)"
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
