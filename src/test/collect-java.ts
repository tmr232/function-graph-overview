import { Query, type Tree } from "web-tree-sitter";
import type { TestFunction } from "./commentTestTypes";
import { parseComment } from "./commentTestUtils";

import { initializeParser } from "../parser-loader/bun.ts";

const { parser, language } = await initializeParser("Java");

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
      (block_comment) @comment
      (method_declaration
        name: (identifier) @name
      ) @func
    )+
  `,
  );
  const matches = testFuncQuery.matches(tree.rootNode);
  for (const match of matches) {
    for (let i = 0; i < match.captures.length; i += 3) {
      const captures = match.captures.slice(i);
      // @ts-expect-error: We know that the captures are OK
      const commentText: string = captures[0].node.text;
      yield {
        // @ts-expect-error: We know that the captures are OK
        function: captures[1].node,
        reqs: parseComment(commentText.slice(2, -2).replaceAll(/^\s+/gm, "")),
        // @ts-expect-error: We know that the captures are OK
        name: captures[2].node.text,
        language: "Java",
      };
    }
  }
}
