import type { MultiDirectedGraph } from "graphology";
import { subgraph } from "graphology-operators";
import { bfsFromNode } from "graphology-traversal";
import type { CFG, GraphNode } from "./cfg-defs";
import { evolve } from "./evolve";

export function distanceFromEntry(cfg: CFG): Map<string, number> {
  const { graph, entry } = cfg;
  const levels = new Map();

  bfsFromNode(graph, entry, (node, _attr, depth) => {
    levels.set(node, depth);
  });

  return levels;
}

/// Can return null to indicate that the merge is not allowed.
/// The function MUST NOT modify the input arguments.
export type AttrMerger = (
  nodeAttrs: GraphNode,
  intoAttrs: GraphNode,
) => GraphNode | null;
function collapseNode(
  graph: MultiDirectedGraph<GraphNode>,
  node: string,
  into: string,
  mergeAttrs?: AttrMerger,
) {
  if (mergeAttrs) {
    const attrs = mergeAttrs(
      graph.getNodeAttributes(node),
      graph.getNodeAttributes(into),
    );
    if (attrs === null) {
      // We can't merge the nodes, so we bail.
      return;
    }

    for (const [name, value] of Object.entries(attrs)) {
      graph.setNodeAttribute(into, name as keyof GraphNode, value);
    }
  }

  graph.forEachEdge(node, (edge, attributes, source, target) => {
    if (target === into) {
      return;
    }

    const replaceNode = (n: string) => (n === node ? into : n);
    const edgeNodes = [replaceNode(source), replaceNode(target)] as const;
    graph.addEdge(...edgeNodes, attributes);
  });

  graph.dropNode(node);
}
/**
 *
 * @param graph The graph to simplify
 */
export function simplifyCFG(cfg: CFG, mergeAttrs?: AttrMerger): CFG {
  const graph = cfg.graph.copy();

  const toCollapse: [string, string][] = graph
    .mapEdges((_edge, _attrs, source, target): [string, string] | null => {
      if (graph.outDegree(source) === 1 && graph.inDegree(target) === 1) {
        return [source, target];
      }
      return null;
    })
    .filter((x) => x) as [string, string][];

  // Sort merges based on topological order
  const levels = distanceFromEntry(cfg);
  toCollapse.sort((a, b) => (levels.get(a[0]) ?? 0) - (levels.get(b[0]) ?? 0));

  let entry = cfg.entry;

  try {
    for (const [source, target] of toCollapse) {
      collapseNode(graph, source, target, mergeAttrs);
      if (entry === source) {
        // Keep track of the entry node!
        entry = target;
      }
    }
  } catch (error) {
    console.log(error);
  }
  return evolve(cfg, { graph, entry });
}

export function trimFor(cfg: CFG): CFG {
  const { graph, entry } = cfg;
  const reachable: string[] = [];

  bfsFromNode(graph, entry, (node) => {
    reachable.push(node);
  });

  return evolve(cfg, { graph: subgraph(graph, reachable) });
}

export function detectBacklinks(
  graph: MultiDirectedGraph,
  entry: string,
): { from: string; to: string }[] {
  const backlinks: { from: string; to: string }[] = [];
  const stack: { node: string; path: string[] }[] = [{ node: entry, path: [] }];
  let current = stack.pop();
  for (; current !== undefined; current = stack.pop()) {
    const { node, path } = current;
    for (const child of graph.outNeighbors(node)) {
      if (path.includes(child)) {
        backlinks.push({ from: node, to: child });
        continue;
      }
      stack.push({ node: child, path: [...path, node] });
    }
  }

  return backlinks;
}
