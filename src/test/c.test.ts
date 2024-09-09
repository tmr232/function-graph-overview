import { expect, test } from "bun:test";
import Parser, { type QueryCapture } from "web-tree-sitter";
import goSampleCode from "./sample.c" with { type: "text" };
import treeSitterC from "../../parsers/tree-sitter-c.wasm?url";
import { CFGBuilder, type CFG } from "../control-flow/cfg-c";
import { simplifyCFG, trimFor } from "../control-flow/graph-ops";
import type { MultiDirectedGraph } from "graphology";
import { bfsFromNode } from "graphology-traversal";
import { graphToDot } from "../control-flow/render";

/*
TODO: Write a script that collects all the test code and generates a webpage
      showing it.
      - Toggle to show only failing tests
      - The usual display toggles
      - Ability to show markers instead of node content
      - Shows the reason the test failed (in text!)
*/

const markerPattern: RegExp = /CFG: (\w+)/;

async function initializeParser(): Promise<[Parser, Parser.Language]> {
  await Parser.init();
  const parser = new Parser();
  const C = await Parser.Language.load(treeSitterC);
  parser.setLanguage(C);
  return [parser, C];
}

const [parser, language] = await initializeParser();
const tree = parser.parse(goSampleCode);

interface Requirements {
  nodes?: number;
  exits?: number;
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

function makeCaptureObject(captures: QueryCapture[]): {
  [key: string]: Parser.SyntaxNode;
} {
  const obj: { [key: string]: Parser.SyntaxNode } = {};
  for (const capture of captures) {
    obj[capture.name] = capture.node;
  }
  return obj;
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
)
  `);
  const matches = testFuncQuery.matches(tree.rootNode);

  for (const match of matches) {
    const { comment, func, name } = makeCaptureObject(match.captures) as {
      comment?: Parser.SyntaxNode;
      func?: Parser.SyntaxNode;
      name?: Parser.SyntaxNode;
    };
    if (!comment || !func || !name) {
      throw new Error("Failed pasring function!");
    }
    yield { function: func, reqs: parseComment(comment.text), name: name.text };
  }
}

function buildCFG(functionNode: Parser.SyntaxNode): CFG {
  const builder = new CFGBuilder();
  return trimFor(builder.buildCFG(functionNode));
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


interface TestCollectorOptions {
  testFunctions: TestFunction[]
}
class TestManager {
  private readonly testFunctions: TestFunction[];
  private readonly testMap: Map<string, TestFunction>;

  constructor(options: TestCollectorOptions) {
    this.testFunctions = options.testFunctions;
    this.testMap = new Map(
      this.testFunctions.map((testFunc) => [testFunc.name, testFunc]),
    );
  }

  public getTestFunc(name: string): TestFunction {
    const testFunc = this.testMap.get(name);
    if (testFunc) return testFunc;
    throw new Error(`Missing func ${name}`);
  }

  public testsFor(reqName: string): string[] {
    return [...this.testMap.entries()].filter(([_name, testFunc]) => {
      return Object.hasOwn(testFunc.reqs, reqName);
    }).map(([name, _testFunc]) => name);
  }

  public testsFor2(reqName: string): [string, TestFunction][] {
    return [...this.testMap.entries()].filter(([_name, testFunc]) => {
      return Object.hasOwn(testFunc.reqs, reqName);
    });
  }
}

const testManager = new TestManager({ testFunctions: [...iterTestFunctions(tree)] });

test.each(testManager.testsFor2("nodes"))("Node count for %s", (name, testFunc) => {
  if (testFunc.reqs.nodes) {
    const cfg = buildSimpleCFG(testFunc.function);
    console.log(graphToDot(cfg));
    expect(cfg.graph.order).toBe(testFunc.reqs.nodes);
  }
});

test.each(testManager.testsFor2("exits"))("Exit count for %s", (name, testFunc) => {
  if (testFunc.reqs.exits) {
    const cfg = buildSimpleCFG(testFunc.function);
    const exitNodes = cfg.graph.filterNodes(
      (node) => cfg.graph.outDegree(node) === 0,
    );
    expect(exitNodes).toHaveLength(testFunc.reqs.exits);
  }
});

test.each(testManager.testsFor2("reaches"))("Reachability for %s", (name, testFunc) => {
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
