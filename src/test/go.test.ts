import { expect, test } from "bun:test";
import Parser from "web-tree-sitter";
import goSampleCode from "./sample.go" with { type: "text" };
import treeSitterGo from "../../parsers/tree-sitter-go.wasm?url";
import { CFGBuilder, type CFG } from "../control-flow/cfg";
import { simplifyCFG } from "../control-flow/graph-ops";
import type { MultiDirectedGraph } from "graphology";
import { bfsFromNode } from "graphology-traversal";

const markerPattern: RegExp = /CFG: (\w+)/;

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
  nodes?: number;
  reaches?: [string, string][];
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
    .replaceAll(/^(?=\w)/gm, '"')
    .replaceAll(/:/gm, '":');
  return JSON.parse(`{${jsonContent}}`);
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

function buildCFG(functionNode: Parser.SyntaxNode): CFG {
  const builder = new CFGBuilder();
  return builder.buildCFG(functionNode);
}

function buildSimpleCFG(functionNode: Parser.SyntaxNode): CFG {
  return simplifyCFG(buildCFG(functionNode));
}

function buildMarkerCFG(functionNode: Parser.SyntaxNode): CFG {
  const builder = new CFGBuilder({ markerPattern });
  return builder.buildCFG(functionNode);
}

function pathExists(
  graph: MultiDirectedGraph,
  source: string,
  target: string,
): boolean {
  let foundTarget = false;
  bfsFromNode(graph, source, (node) => {
    foundTarget ||= node == target;
    return foundTarget;
  });
  return foundTarget;
}

function getMarkerMap(cfg: CFG): Map<string, string> {
  const markerMap: Map<string, string> = new Map();
  cfg.graph.forEachNode((node, { markers }) => {
    markers.forEach((marker) => markerMap.set(marker, node));
  });
  return markerMap;
}

const testFunctions = [...iterTestFunctions(tree)];
const testMap = new Map(
  testFunctions.map((testFunc) => [testFunc.name, testFunc]),
);
const testNames = [...testMap.keys()];

function testsFor(reqName: string): string[] {
  return testNames.filter((name) => {
    const testFunc = testMap.get(name) as TestFunction;
    return Object.hasOwn(testFunc.reqs, reqName);
  });
}

test.each(testsFor("nodes"))("Node count for %s", (name) => {
  const testFunc = testMap.get(name) as TestFunction;
  expect(testFunc).toBeDefined();

  if (testFunc.reqs.nodes) {
    const cfg = buildSimpleCFG(testFunc.function);
    expect(cfg.graph.order).toBe(testFunc.reqs.nodes);
  }
});

test.each(testsFor("reaches"))("Reachability for %s", (name) => {
  const testFunc = testMap.get(name) as TestFunction;
  expect(testFunc).toBeDefined();

  if (testFunc.reqs.reaches) {
    const cfg = buildMarkerCFG(testFunc.function);
    const markerMap = getMarkerMap(cfg);
    const getNode = (marker: string) => {
      const node = markerMap.get(marker);
      if (node) {
        return node;
      }
      throw new Error(`No node found for marker ${marker}`);
    };
    testFunc.reqs.reaches.forEach(([source, target]) =>
      expect(pathExists(cfg.graph, getNode(source), getNode(target))).toBe(
        true,
      ),
    );
  }
});
