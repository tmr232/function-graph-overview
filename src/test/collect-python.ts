import type Parser from "web-tree-sitter";
import treeSitterPython from "../../parsers/tree-sitter-python.wasm?url";
import { parseComment } from "./commentTestUtils";
import type { TestFunction } from "./commentTestTypes";
import { initializeParser } from "./parser-init";

const { parser, language } = await initializeParser(treeSitterPython);

export function getTestFuncs(code: string): Generator<TestFunction> {
  const tree = parser.parse(code);
  return iterTestFunctions(tree);
}

function* iterTestFunctions(tree: Parser.Tree): Generator<TestFunction> {
  const testFuncQuery = language.query(`
  (
    (comment)+ @comment
    (function_definition
      name: (_) @name
      body: (_) @body) @func
  )+
  `);
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
