import { expect, test } from "bun:test";
import Parser from "web-tree-sitter";
import goSampleCode from "./nodecount.go" with {type: "text"};
import treeSitterGo from "../../parsers/tree-sitter-go.wasm?url"
import { CFGBuilder, type CFG } from "../control-flow/cfg";
import { simplifyCFG } from "../control-flow/graph-ops";

async function initializeParser() {
  await Parser.init();
  const parser = new Parser();
  const Go = await Parser.Language.load(treeSitterGo);
  parser.setLanguage(Go);
  return parser;
}

const parser = await initializeParser();
const tree = parser.parse(goSampleCode);


interface Requirements {
  nodes: number;
}
interface TestFunction {
  name: string;
  function: Parser.SyntaxNode;
  reqs: Requirements;
}

function parseComment(text: string): Requirements {
  const jsonContent = text
    .slice(2, -2)
    .trim()
    .replaceAll(/^/gm, '"')
    .replaceAll(/:/gm, '":')
    .replaceAll(/$/gm, ",")
    .replaceAll(/,$/gm, "");
  return JSON.parse(`{${jsonContent}}`)
}

function* iterTestFunctions(tree: Parser.Tree): Generator<TestFunction> {
  const funcTypes = [
    "function_declaration",
    "method_declaration",
    "func_literal",
  ];

  for (let i = 0; i < tree.rootNode.childCount - 1; i++) {
    const commentNode = tree.rootNode.children[i];
    const functionNode = tree.rootNode.children[i + 1];

    if (!funcTypes.includes(functionNode.type)) { continue; }
    const functionName = functionNode.childForFieldName("name")?.text as string;

    if (commentNode.type != "comment") {
      throw new Error(`function without comment: ${functionName}`);
    }

    try {
      yield { function: functionNode, reqs: parseComment(commentNode.text), name: functionName }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`invalid JSON comment on ${functionName}`)
      } else {
        throw error;
      }
    }
  }
}

function buildCFG(functionNode: Parser.SyntaxNode): CFG {
  const builder = new CFGBuilder();
  return builder.buildCFG(functionNode);
}

function buildSimpleCFG(functionNode: Parser.SyntaxNode): CFG {
  return simplifyCFG(buildCFG(functionNode));
}



const testFunctions = [...iterTestFunctions(tree)];
const testMap = new Map(testFunctions.map(testFunc => [testFunc.name, testFunc]));
const testNames = [...testMap.keys()]
test.each(testNames)("Node count for %s", (name) => {
  const testFunc = testMap.get(name) as TestFunction;
  expect(testFunc).toBeDefined();

  const cfg = buildSimpleCFG(testFunc.function);
  expect(cfg.graph.order).toBe(testFunc.reqs.nodes);

})