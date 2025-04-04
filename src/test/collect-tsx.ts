import { Query, type Tree } from "web-tree-sitter";
import type { TestFunction } from "./commentTestTypes";

import { initializeParser } from "../parser-loader/bun.ts";
import { parseComment } from "./commentTestUtils.ts";

const { parser, language } = await initializeParser("TSX");

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
      (comment) @comment
      (function_declaration 
        name: (identifier) @name
      ) @func
    )+
  `,
  );
  const matches = testFuncQuery.matches(tree.rootNode, { maxStartDepth: 1 });
  for (const match of matches) {
    for (let i = 0; i < match.captures.length; i += 3) {
      const captures = match.captures.slice(i);
      yield {
        // @ts-expect-error: We know that the captures are OK
        function: captures[1].node,
        // @ts-expect-error: We know that the captures are OK
        reqs: parseComment(captures[0].node.text.slice(2, -2)),
        // @ts-expect-error: We know that the captures are OK
        name: captures[2].node.text,
        language: "TSX",
      };
    }
  }
}
