import type { MultiDirectedGraph } from "graphology";
import { subgraph } from "graphology-operators";
import { bfsFromNode } from "graphology-traversal";
import type { CFG, GraphNode } from "./cfg-defs";

export function distanceFromEntry(cfg: CFG): Map<string, number> {
  const { graph, entry } = cfg;
  const levels = new Map();

  bfsFromNode(graph, entry, (node, _attr, depth) => {
    levels.set(node, depth);
  });

  return levels;
}

/**
 * Merges the attributes of two nodes, or aborts the merge.
 *
 * The function MUST NOT modify the input arguments.
 *
 * @param nodeAttrs the node to disappear
 * @param intoAttrs the node accepting the new attributes
 * @returns the new node attribute if the merge is successful, or `null` to abort it.
 */
export type AttrMerger = (
  nodeAttrs: GraphNode,
  intoAttrs: GraphNode,
) => GraphNode | null;

/**
 * Collapses one node into another, migrating all relevant edges and merging
 * the node attributes.
 *
 * @param graph The graph to collapse in
 * @param node Node to collapse
 * @param into Collapse target
 * @param mergeAttrs Controls the merger of attributes. Can prevent collapsing.
 */
function collapseNode(
  graph: MultiDirectedGraph<GraphNode>,
  node: string,
  into: string,
  mergeAttrs?: AttrMerger,
): void {
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
 * Simplify the CFG by removing "trivial" nodes.
 *
 * Trivial nodes are nodes that do not contribute to the branching structure of
 * the CFG.
 *
 * Two linked nodes are considered "trivial" if and only if:
 * - The source only has one outgoing edge
 * - The destination only has one incoming edge
 *
 * ```dot-cfg
 * subgraph cluster_0 { label="Trivial pair" color="none"
 *    s1
 *    d1
 *    s1 -> d1
 * }
 *
 * subgraph cluster_1 { label="Non-trivial pairs" color="none"
 *    d3 [width=0.3; height=0.1]
 *    s2 -> d3 [class="alternative"]
 *    s2 -> d2 [class="consequence"]
 *
 *    s3 [width=0.3; height=0.1]
 *    s3 -> d4
 *    s4 -> d4
 * }
 * ```
 *
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
    .filter(Boolean) as [string, string][];

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
  return { entry: entry, graph: graph, offsetToNode: cfg.offsetToNode.clone() };
}

/**
 * Remove all nodes not reachable from the CFG's entry
 *
 * @param cfg The CFG to trim
 * @returns a copy of the CFG, with the unreachable nodes removed
 */
export function trimFor(cfg: CFG): CFG {
  const { graph, entry } = cfg;
  const reachable: string[] = [];

  bfsFromNode(graph, entry, (node) => {
    reachable.push(node);
  });

  return {
    entry: cfg.entry,
    graph: subgraph(graph, reachable),
    offsetToNode: cfg.offsetToNode.clone(),
  };
}

export function detectBacklinks(
  graph: MultiDirectedGraph,
  entry: string,
): { from: string; to: string }[] {
  const backlinks: { from: string; to: string }[] = [];
  // Using Set() for O(1) path lookups
  const stack: { node: string; path: Set<string> }[] = [
    { node: entry, path: new Set<string>() },
  ];

  const alreadyFound = (backlink: { from: string; to: string }): boolean => {
    return backlinks.some(
      (item) => item.from === backlink.from && item.to === backlink.to,
    );
  };

  // If we ever visit a node that lead to a cycle, we will find the cycle.
  // No need to revisit nodes from different paths.
  const visited = new Set<string>();

  let current = stack.pop();
  for (; current !== undefined; current = stack.pop()) {
    const { node, path } = current;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const child of graph.outNeighbors(node)) {
      // Self-loops must be explicitly checked because of the sequence of stack pushes
      if (path.has(child) || child === node) {
        // Only store backlinks once
        const backlink = { from: node, to: child };
        if (!alreadyFound(backlink)) {
          backlinks.push(backlink);
        }
        continue;
      }
      stack.push({ node: child, path: new Set(path).add(node) });
    }
  }

  return backlinks;
}
