import { describe, it, expect } from "bun:test";
import { extractFunctionName } from "../render/src/App.svelte";
import type { Node as SyntaxNode } from "web-tree-sitter";

describe("extractFunctionName - Go", () => {
    it("should extract the name of a function_declaration in Go", () => {
      const testNode: SyntaxNode = {
        type: "function_declaration",
        descendantsOfType: () => [{ type: "identifier", text: "myGoFunction" }],
      } as unknown as SyntaxNode;
  
      const result = extractFunctionName(testNode, "Go");
      expect(result).toBe("myGoFunction");
    });
  
    it("should extract the name of a method_declaration in Go", () => {
      const testNode: SyntaxNode = {
        type: "method_declaration",
        descendantsOfType: () => [{ type: "identifier", text: "myGoMethod" }],
      } as unknown as SyntaxNode;
  
      const result = extractFunctionName(testNode, "Go");
      expect(result).toBe("myGoMethod");
    });
  
    it("should extract the name of a func_literal in Go", () => {
      const testNode: SyntaxNode = {
        type: "func_literal",
        descendantsOfType: () => [{ type: "identifier", text: "myGoLiteral" }],
      } as unknown as SyntaxNode;
  
      const result = extractFunctionName(testNode, "Go");
      expect(result).toBe("myGoLiteral");
    });
  });
  describe("extractFunctionName - C", () => {
    it("should extract the name of a function_definition in C", () => {
      const testNode: SyntaxNode = {
        type: "function_definition",
        descendantsOfType: () => [{ type: "identifier", text: "myCFunction" }],
        parent: null, // Ensure parent is defined to avoid runtime errors
      } as unknown as SyntaxNode;
  
      const result = extractFunctionName(testNode, "C");
      expect(result).toBe("myCFunction");
    });
  });
  describe("extractFunctionName - C++", () => {
    it("should extract the name of a function_definition in C++", () => {
      const testNode: SyntaxNode = {
        type: "function_definition",
        descendantsOfType: () => [{ type: "identifier", text: "myCppFunction" }],
        parent: null, // Ensure parent is defined to avoid runtime errors
      } as unknown as SyntaxNode;
  
      const result = extractFunctionName(testNode, "C++");
      expect(result).toBe("myCppFunction");
    });
  
    it("should extract the name of a lambda_expression in C++", () => {
      const testNode: SyntaxNode = {
        type: "lambda_expression",
        descendantsOfType: () => [{ type: "identifier", text: "myCppLambda" }],
        parent: null, // Ensure parent is defined to avoid runtime errors
      } as unknown as SyntaxNode;
  
      const result = extractFunctionName(testNode, "C++");
      expect(result).toBe("myCppLambda");
    });
  });
  describe("extractFunctionName - Python", () => {
  it("should extract the name of a function_definition in Python", () => {
    const testNode: SyntaxNode = {
      type: "function_definition",
      descendantsOfType: () => [{ type: "identifier", text: "myPythonFunction" }],
      parent: null, // Ensure parent is defined to avoid runtime errors
    } as unknown as SyntaxNode;

    const result = extractFunctionName(testNode, "Python");
    expect(result).toBe("myPythonFunction");
  });
});
describe("extractFunctionName - TypeScript", () => {
  it("should extract the name of a function_declaration in TypeScript", () => {
    const testNode: SyntaxNode = {
      type: "function_declaration",
      descendantsOfType: () => [{ type: "identifier", text: "myTsFunction" }],
      parent: null,
    } as unknown as SyntaxNode;

    const result = extractFunctionName(testNode, "TypeScript");
    expect(result).toBe("myTsFunction");
  });

  it("should extract the name of an arrow_function in TypeScript", () => {
    const testNode: SyntaxNode = {
      type: "arrow_function",
      parent: {
        type: "variable_declarator",
        namedChildren: [{ type: "identifier", text: "myArrowFunction" }],
        parent: null,
      },
      descendantsOfType: () => [],
    } as unknown as SyntaxNode;

    const result = extractFunctionName(testNode, "TypeScript");
    expect(result).toBe("myArrowFunction");
  });

  it("should extract the name of a method_definition in TypeScript", () => {
    const testNode: SyntaxNode = {
      type: "method_definition",
      descendantsOfType: () => [{ type: "identifier", text: "myMethod" }],
      parent: null,
    } as unknown as SyntaxNode;

    const result = extractFunctionName(testNode, "TypeScript");
    expect(result).toBe("myMethod");
  });

  it("should extract the name of a function_expression in TypeScript", () => {
    const testNode: SyntaxNode = {
      type: "function_expression",
      descendantsOfType: () => [{ type: "identifier", text: "myFunctionExpression" }],
      parent: null,
    } as unknown as SyntaxNode;

    const result = extractFunctionName(testNode, "TypeScript");
    expect(result).toBe("myFunctionExpression");
  });

  it("should extract the name of a generator_function in TypeScript", () => {
    const testNode: SyntaxNode = {
      type: "generator_function",
      descendantsOfType: () => [{ type: "identifier", text: "myGeneratorFunction" }],
      parent: null,
    } as unknown as SyntaxNode;

    const result = extractFunctionName(testNode, "TypeScript");
    expect(result).toBe("myGeneratorFunction");
  });

  it("should extract the name of a generator_function_declaration in TypeScript", () => {
    const testNode: SyntaxNode = {
      type: "generator_function_declaration",
      descendantsOfType: () => [{ type: "identifier", text: "myGeneratorFunctionDeclaration" }],
      parent: null,
    } as unknown as SyntaxNode;

    const result = extractFunctionName(testNode, "TypeScript");
    expect(result).toBe("myGeneratorFunctionDeclaration");
  });
});
