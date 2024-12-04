import type { MultiDirectedGraph } from "graphology";
import { bfsFromNode } from "graphology-traversal";
import type Parser from "web-tree-sitter";
import {
  type Language as CFGLanguage,
  newCFGBuilder,
} from "../control-flow/cfg";
import { type CFG, mergeNodeAttrs } from "../control-flow/cfg-defs";
import { simplifyCFG, trimFor } from "../control-flow/graph-ops";
import { graphToDot } from "../control-flow/render";
import type { TestFunction } from "./commentTestTypes";

const markerPattern: RegExp = /CFG: (\w+)/;

function buildCFG(language: CFGLanguage, functionNode: Parser.SyntaxNode): CFG {
  const builder = newCFGBuilder(language, {});
  return trimFor(builder.buildCFG(functionNode));
}

const simpleCFGCache = new Map<Parser.SyntaxNode, CFG>();
export function buildSimpleCFG(
  language: CFGLanguage,
  functionNode: Parser.SyntaxNode,
): CFG {
  const cachedCFG = simpleCFGCache.get(functionNode);
  if (cachedCFG) {
    return cachedCFG;
  }
  const cfg = simplifyCFG(buildCFG(language, functionNode), mergeNodeAttrs);
  simpleCFGCache.set(functionNode, cfg);
  return cfg;
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
    foundTarget ||= node === target;
    return foundTarget;
  });
  return foundTarget;
}

function getMarkerMap(cfg: CFG): Map<string, string> {
  const markerMap: Map<string, string> = new Map();
  cfg.graph.forEachNode((node, { markers }) => {
    for (const marker of markers) {
      markerMap.set(marker, node);
    }
  });
  return markerMap;
}

export type RequirementHandler = (testFunc: TestFunction) => null | string;
export const requirementTests: {
  [key: string]: RequirementHandler | undefined;
} = {
  nodes(testFunc: TestFunction) {
    if (testFunc.reqs.nodes !== undefined) {
      const cfg = buildSimpleCFG(testFunc.language, testFunc.function);
      if (cfg.graph.order !== testFunc.reqs.nodes) {
        return `expected ${testFunc.reqs.nodes} nodes but found ${cfg.graph.order}`;
      }
    }
    return null;
  },
  exits(testFunc: TestFunction) {
    if (testFunc.reqs.exits !== undefined) {
      const cfg = buildSimpleCFG(testFunc.language, testFunc.function);
      const exitNodes = cfg.graph.filterNodes(
        (node) => cfg.graph.outDegree(node) === 0,
      );
      if (exitNodes.length !== testFunc.reqs.exits) {
        return `expected ${testFunc.reqs.exits} exits but found ${exitNodes.length}`;
      }
    }
    return null;
  },
  reaches(testFunc: TestFunction) {
    if (testFunc.reqs.reaches !== undefined) {
      const cfg = buildMarkerCFG(testFunc.language, testFunc.function);
      const markerMap = getMarkerMap(cfg);
      const getNode = (marker: string) => {
        const node = markerMap.get(marker);
        if (node) {
          return node;
        }
        throw new Error(`No node found for marker ${marker}`);
      };
      for (const [source, target] of testFunc.reqs.reaches) {
        if (!pathExists(cfg.graph, getNode(source), getNode(target))) {
          return `expected path from ${source} to ${target} but none was found`;
        }
      }
    }
    return null;
  },
  render(testFunc: TestFunction) {
    if (testFunc.reqs.render !== undefined) {
      const cfg = buildSimpleCFG(testFunc.language, testFunc.function);
      try {
        graphToDot(cfg);
      } catch (error) {
        console.trace(error);
        return `failed to render due to ${error}`;
      }
    }
    return null;
  },
};
