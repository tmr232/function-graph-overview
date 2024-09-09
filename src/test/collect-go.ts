import Parser from "web-tree-sitter";
import goSampleCode from "./sample.go" with { type: "text" };
import treeSitterGo from "../../parsers/tree-sitter-go.wasm?url";
import { parseComment, type TestFunction } from "./commentTestUtils";

async function initializeParser() {
  await Parser.init();
  const parser = new Parser();
  const Go = await Parser.Language.load(treeSitterGo);
  parser.setLanguage(Go);
  return parser;
}

const parser = await initializeParser();
const tree = parser.parse(goSampleCode);

function* iterTestFunctions(tree: Parser.Tree): Generator<TestFunction> {
  const funcTypes = [
    "function_declaration",
    "method_declaration",
    "func_literal",
  ];

  for (let i = 0; i < tree.rootNode.childCount - 1; i++) {
    const commentNode = tree.rootNode.children[i];
    const functionNode = tree.rootNode.children[i + 1];

    if (!funcTypes.includes(functionNode.type)) {
      continue;
    }
    const functionName = functionNode.childForFieldName("name")?.text as string;

    if (commentNode.type != "comment") {
      throw new Error(`function without comment: ${functionName}`);
    }

    try {
      yield {
        function: functionNode,
        reqs: parseComment(commentNode.text),
        name: functionName,
        language: "Go",
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`invalid JSON comment on ${functionName}`);
      } else {
        throw error;
      }
    }
  }
}

export const testFunctions = [...iterTestFunctions(tree)];
