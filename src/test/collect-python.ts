import { Query, type Tree } from "web-tree-sitter";
import type { TestFunction } from "./commentTestTypes";
import { parseComment } from "./commentTestUtils";

import { initializeParser } from "../parser-loader/bun.ts";

const { parser, language } = await initializeParser("Python");

export function* getTestFuncs(code: string): Generator<TestFunction> {
  const tree = parser.parse(code);
  if (!tree) {
    return;
  }
  yield* iterTestFunctions(tree);
}

function* iterTestFunctions(tree: Tree): Generator<TestFunction> {
  const testFuncQuery = new Query(
    language,
    `
  (
    (comment)+ @comment
    (function_definition
      name: (_) @name
      body: (_) @body) @func
  )+
  `,
  );
  const matches = testFuncQuery.matches(tree.rootNode, { maxStartDepth: 1 });

  for (const match of matches) {
    for (
      let i = 0;
      i < match.captures.length;
      i += testFuncQuery.captureNames.length - 1
    ) {
      const captures = match.captures;
      const comments = [];
      // @ts-expect-error: We know that the captures are OK
      for (; captures[i].name === "comment"; ++i) {
        // @ts-expect-error: We know that the captures are OK
        comments.push(captures[i].node.text.slice(1).trim());
      }
      yield {
        // @ts-expect-error: We know that the captures are OK
        function: captures[i].node,
        reqs: parseComment(comments.join("\n")),
        // @ts-expect-error: We know that the captures are OK
        name: captures[i + 1].node.text,
        language: "Python",
      };
    }
  }
}
