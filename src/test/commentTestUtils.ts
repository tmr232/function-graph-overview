import { expect } from "bun:test";
import Parser from "web-tree-sitter";
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


export interface Requirements {
  nodes?: number;
  exits?: number;
  reaches?: [string, string][];
}
export interface TestFunction {
  name: string;
  function: Parser.SyntaxNode;
  reqs: Requirements;
}

export function parseComment(text: string): Requirements {
  const jsonContent = text
    .slice(2, -2)
    .trim()
    .replaceAll(/^(?=\w)/gm, '"')
    .replaceAll(/:/gm, '":');
  return JSON.parse(`{${jsonContent}}`);
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

type RequirementHandler = (testFunc: TestFunction) => void;
const requirementTests: {
  [key: string]: RequirementHandler | undefined;
} = {
  nodes(testFunc: TestFunction) {
    if (testFunc.reqs.nodes) {
      const cfg = buildSimpleCFG(testFunc.function);
      console.log(graphToDot(cfg));
      expect(cfg.graph.order).toBe(testFunc.reqs.nodes);
    }
  },
  exits(testFunc: TestFunction) {
    if (testFunc.reqs.exits) {
      const cfg = buildSimpleCFG(testFunc.function);
      const exitNodes = cfg.graph.filterNodes(
        (node) => cfg.graph.outDegree(node) === 0,
      );
      expect(exitNodes).toHaveLength(testFunc.reqs.exits);
    }
  },
  reaches(testFunc: TestFunction) {
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
  },
};

interface TestManagerOptions {
  testFunctions: TestFunction[];
}
export class TestManager {
  private readonly testFunctions: TestFunction[];
  private readonly testMap: Map<string, TestFunction>;
  public readonly nameFormat = "%s";
  // @ts-expect-error: Implicit any type
  public readonly invoke = (_name, testFunc, reqHandler) => {
    reqHandler(testFunc);
  };


  constructor(options: TestManagerOptions) {
    this.testFunctions = options.testFunctions;
    this.testMap = new Map(
      this.testFunctions.map((testFunc) => [testFunc.name, testFunc]),
    );
  }

  public get allTests() {
    const tests = [];
    for (const testFunc of this.testFunctions) {
      for (const [key, _value] of Object.entries(testFunc.reqs)) {
        const testName = `${testFunc.name}: ${key}`;
        const reqHandler = requirementTests[key];
        if (!reqHandler) {
          continue;
        }
        tests.push([testName, testFunc, reqHandler]);
      }
    }
    return tests;
  }
}


