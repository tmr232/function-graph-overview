import Parser from "web-tree-sitter";
import goSampleCode from "./sample.c" with { type: "text" };
import treeSitterC from "../../parsers/tree-sitter-c.wasm?url";
import { parseComment, type TestFunction } from "./commentTestUtils";


/*
TODO: Write a script that collects all the test code and generates a webpage
      showing it.
      - Toggle to show only failing tests
      - The usual display toggles
      - Ability to show markers instead of node content
      - Shows the reason the test failed (in text!)
*/


async function initializeParser(): Promise<[Parser, Parser.Language]> {
  await Parser.init();
  const parser = new Parser();
  const C = await Parser.Language.load(treeSitterC);
  parser.setLanguage(C);
  return [parser, C];
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
  const matches = testFuncQuery.matches(tree.rootNode);
  for (const match of matches) {
    for (let i = 0; i < match.captures.length; i += 4) {
      const captures = match.captures.slice(i);
      yield {
        function: captures[1].node,
        reqs: parseComment(captures[0].node.text),
        name: captures[2].node.text,
      };
    }
  }
}


const [parser, language] = await initializeParser();
const tree = parser.parse(goSampleCode);
export const testFunctions = [...iterTestFunctions(tree)]
