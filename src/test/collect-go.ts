import type { Node as SyntaxNode, Tree } from "web-tree-sitter";
import type { TestFunction } from "./commentTestTypes";
import { parseComment } from "./commentTestUtils";

import { initializeParser } from "../parser-loader/bun.ts";

const { parser } = await initializeParser("Go");

export function* getTestFuncs(code: string): Generator<TestFunction> {
  const tree = parser.parse(code);
  if (!tree) {
    return;
  }
  yield* iterTestFunctions(tree);
}

function* iterTestFunctions(tree: Tree): Generator<TestFunction> {
  const funcTypes = new Set([
    "function_declaration",
    "method_declaration",
    "func_literal",
  ]);

  for (let i = 0; i < tree.rootNode.childCount - 1; i++) {
    const commentNode = tree.rootNode.children[i] as SyntaxNode;
    const functionNode = tree.rootNode.children[i + 1] as SyntaxNode;

    if (!funcTypes.has(functionNode.type)) {
      continue;
    }
    const functionName = functionNode.childForFieldName("name")?.text as string;

    if (commentNode.type !== "comment") {
      throw new Error(`function without comment: ${functionName}`);
    }

    try {
      yield {
        function: functionNode,
        reqs: parseComment(commentNode.text.slice(2, -2)),
        name: functionName,
        language: "Go",
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`invalid JSON comment on ${functionName}`);
      }
      throw error;
    }
  }
}
