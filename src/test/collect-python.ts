import Parser from "web-tree-sitter";
import treeSitterPython from "../../parsers/tree-sitter-python.wasm?url";
import { parseComment } from "./commentTestUtils";
import type { TestFunction } from "./commentTestTypes";


async function initializeParser(): Promise<[Parser, Parser.Language]> {
  await Parser.init();
  const parser = new Parser();
  const language = await Parser.Language.load(treeSitterPython);
  parser.setLanguage(language);
  return [parser, language];
}
const [parser, language] = await initializeParser();

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
  const matches = testFuncQuery.matches(tree.rootNode);

  for (const match of matches) {
    for (let i = 0; i < match.captures.length; i += testFuncQuery.captureNames.length - 1) {
      const captures = match.captures;
      const comments = [];
      for (; captures[i].name === "comment"; ++i) {
        comments.push(captures[i].node.text.slice(1).trim());
      }
      yield {
        function: captures[i].node,
        reqs: parseComment(comments.join("\n")),
        name: captures[i + 1].node.text,
        language: "Python"
      }
    }
  }
}