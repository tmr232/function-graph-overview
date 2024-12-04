import type Parser from "web-tree-sitter";
import type { TestFunction } from "./commentTestTypes";
import { parseComment } from "./commentTestUtils";

import { initializeParser } from "../parser-loader/bun.ts";

const { parser, language } = await initializeParser("C");

export function getTestFuncs(code: string): Generator<TestFunction> {
  const tree = parser.parse(code);
  return iterTestFunctions(tree);
}

function* iterTestFunctions(tree: Parser.Tree): Generator<TestFunction> {
  const testFuncQuery = language.query(`
    (
  (comment) @comment
  (function_definition (
		(function_declarator (identifier) @name)
        body: (compound_statement) @body
        )
  ) @func
)+
  `);
  const matches = testFuncQuery.matches(tree.rootNode, { maxStartDepth: 1 });
  for (const match of matches) {
    for (let i = 0; i < match.captures.length; i += 4) {
      const captures = match.captures.slice(i);
      yield {
        // @ts-expect-error: We know that the captures are OK
        function: captures[1].node,
        // @ts-expect-error: We know that the captures are OK
        reqs: parseComment(captures[0].node.text.slice(2, -2)),
        // @ts-expect-error: We know that the captures are OK
        name: captures[2].node.text,
        language: "C",
      };
    }
  }
}
