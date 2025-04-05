import { expect, test } from "bun:test";
import { extractFunctionName } from "../control-flow/function-utils.ts";
import type { Node as SyntaxNode } from "web-tree-sitter";

function makeNode(props: Partial<SyntaxNode>): SyntaxNode {
  return {
    type: "",
    namedChildren: [],
    parent: null,
    descendantsOfType: () => [],
    ...props,
  } as unknown as SyntaxNode;
}

test("Go: function_declaration", () => {
  const node = makeNode({
    type: "function_declaration",
    namedChildren: [makeNode({ type: "identifier", text: "goFunc" })],
  });
  expect(extractFunctionName(node, "Go")).toBe("goFunc");
});

test("Go: method_declaration", () => {
  const node = makeNode({
    type: "method_declaration",
    namedChildren: [makeNode({ type: "field_identifier", text: "goMethod" })],
  });
  expect(extractFunctionName(node, "Go")).toBe("goMethod");
});

test("Go: func_literal assigned to variable", () => {
  const variableDecl = makeNode({
    type: "variable_declaration",
    namedChildren: [makeNode({ type: "identifier", text: "goLiteralVar" })],
  });
  const funcLiteral = makeNode({ type: "func_literal", parent: variableDecl });
  expect(extractFunctionName(funcLiteral, "Go")).toBe("goLiteralVar");
});

test("Go: func_literal with no parent", () => {
  const node = makeNode({ type: "func_literal" });
  expect(extractFunctionName(node, "Go")).toBe(null);
});

test("C: function_definition", () => {
  const node = makeNode({
    type: "function_definition",
    descendantsOfType: () => [makeNode({ type: "identifier", text: "cFunc" })],
  });
  expect(extractFunctionName(node, "C")).toBe("cFunc");
});

test("C: function_definition with no identifiers", () => {
  const node = makeNode({
    type: "function_definition",
    descendantsOfType: () => [],
  });
  expect(extractFunctionName(node, "C")).toBe(null);
});

test("C++: function_definition", () => {
  const node = makeNode({
    type: "function_definition",
    descendantsOfType: () => [makeNode({ type: "identifier", text: "cppFunc" })],
  });
  expect(extractFunctionName(node, "C++")).toBe("cppFunc");
});

test("C++: lambda_expression → variable", () => {
  const initDecl = makeNode({
    type: "init_declarator",
    namedChildren: [makeNode({ type: "identifier", text: "myLambda" })],
  });
  const lambda = makeNode({ type: "lambda_expression", parent: initDecl });
  expect(extractFunctionName(lambda, "C++")).toBe("myLambda");
});

test("C++: lambda_expression → anonymous fallback", () => {
  const lambda = makeNode({ type: "lambda_expression" });
  expect(extractFunctionName(lambda, "C++")).toBe("Lambda Expression (Anonymous)");
});

test("Python: function_definition", () => {
  const node = makeNode({
    type: "function_definition",
    namedChildren: [makeNode({ type: "identifier", text: "pyFunc" })],
  });
  expect(extractFunctionName(node, "Python")).toBe("pyFunc");
});

test("Python: function_definition with no identifier", () => {
  const node = makeNode({ type: "function_definition", namedChildren: [] });
  expect(extractFunctionName(node, "Python")).toBe(null);
});

test("TypeScript: function_declaration", () => {
  const node = makeNode({
    type: "function_declaration",
    namedChildren: [makeNode({ type: "identifier", text: "tsFunc" })],
  });
  expect(extractFunctionName(node, "TypeScript")).toBe("tsFunc");
});

test("TypeScript: arrow_function with variable", () => {
  const variableDecl = makeNode({
    type: "variable_declarator",
    namedChildren: [makeNode({ type: "identifier", text: "arrowFunc" })],
  });
  const arrowFunc = makeNode({ type: "arrow_function", parent: variableDecl });
  expect(extractFunctionName(arrowFunc, "TypeScript")).toBe("arrowFunc");
});

test("TypeScript: arrow_function with no parent", () => {
  const arrowFunc = makeNode({ type: "arrow_function" });
  expect(extractFunctionName(arrowFunc, "TypeScript")).toBe(null);
});

test("TypeScript: method_definition", () => {
  const node = makeNode({
    type: "method_definition",
    namedChildren: [makeNode({ type: "property_identifier", text: "methodName" })],
  });
  expect(extractFunctionName(node, "TypeScript")).toBe("methodName");
});

test("TypeScript: function_expression with identifier", () => {
  const namedExpr = makeNode({
    type: "function_expression",
    namedChildren: [makeNode({ type: "identifier", text: "namedExpr" })],
  });
  expect(extractFunctionName(namedExpr, "TypeScript")).toBe("namedExpr");
});

test("TypeScript: function_expression with variable", () => {
  const variableDecl = makeNode({
    type: "variable_declarator",
    namedChildren: [makeNode({ type: "identifier", text: "assignedExpr" })],
  });
  const anonFunc = makeNode({ type: "function_expression", parent: variableDecl });
  expect(extractFunctionName(anonFunc, "TypeScript")).toBe("assignedExpr");
});

test("TypeScript: function_expression with no name or variable", () => {
  const node = makeNode({ type: "function_expression" });
  expect(extractFunctionName(node, "TypeScript")).toBe(null);
});

test("TypeScript: generator_function", () => {
  const node = makeNode({
    type: "generator_function",
    namedChildren: [makeNode({ type: "identifier", text: "genFunc" })],
  });
  expect(extractFunctionName(node, "TypeScript")).toBe("genFunc");
});

test("TypeScript: generator_function_declaration", () => {
  const node = makeNode({
    type: "generator_function_declaration",
    namedChildren: [makeNode({ type: "identifier", text: "genFuncDecl" })],
  });
  expect(extractFunctionName(node, "TypeScript")).toBe("genFuncDecl");
});
