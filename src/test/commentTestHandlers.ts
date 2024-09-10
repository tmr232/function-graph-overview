import { expect } from "bun:test";

import { type CFG } from "../control-flow/cfg-defs";
import { simplifyCFG, trimFor } from "../control-flow/graph-ops";
import type { MultiDirectedGraph } from "graphology";
import { bfsFromNode } from "graphology-traversal";
import { graphToDot } from "../control-flow/render";
import {
  newCFGBuilder,
  type Language as CFGLanguage,
} from "../control-flow/cfg";
import type Parser from "web-tree-sitter";

const markerPattern: RegExp = /CFG: (\w+)/;

function buildCFG(language: CFGLanguage, functionNode: Parser.SyntaxNode): CFG {
  const builder = newCFGBuilder(language, {});
  return trimFor(builder.buildCFG(functionNode));
}

function buildSimpleCFG(
  language: CFGLanguage,
  functionNode: Parser.SyntaxNode,
): CFG {
  return simplifyCFG(buildCFG(language, functionNode));
}

function buildMarkerCFG(
  language: CFGLanguage,
  functionNode: Parser.SyntaxNode,
): CFG {
  const builder = newCFGBuilder(language, { markerPattern });
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
export const requirementTests: {
  [key: string]: RequirementHandler | undefined;
} = {
  nodes(testFunc: TestFunction) {
    if (testFunc.reqs.nodes) {
      const cfg = buildSimpleCFG(testFunc.language, testFunc.function);
      console.log(graphToDot(cfg));
      expect(cfg.graph.order).toBe(testFunc.reqs.nodes);
    }
  },
  exits(testFunc: TestFunction) {
    if (testFunc.reqs.exits) {
      const cfg = buildSimpleCFG(testFunc.language, testFunc.function);
      const exitNodes = cfg.graph.filterNodes(
        (node) => cfg.graph.outDegree(node) === 0,
      );
      expect(exitNodes).toHaveLength(testFunc.reqs.exits);
    }
  },
  reaches(testFunc: TestFunction) {
    if (testFunc.reqs.reaches) {
      const cfg = buildMarkerCFG(testFunc.language, testFunc.function);
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
