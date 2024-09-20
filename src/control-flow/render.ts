import { detectBacklinks } from "./graph-ops";
import type { CFG, CFGGraph, Cluster, ClusterId } from "./cfg-defs";
import { subgraph } from "graphology-operators";
import { MultiDirectedGraph } from "graphology";

class RenderContext {
  public readonly verbose: boolean;
  private readonly backlinks: { from: string; to: string }[];

  constructor(verbose: boolean, backlinks: { from: string; to: string }[]) {
    this.verbose = verbose;
    this.backlinks = backlinks;
  }

  public isBacklink(from: string, to: string): boolean {
    return (
      this.backlinks.findIndex(
        (backlink) => from === backlink.from && to === backlink.to,
      ) != -1
    );
  }
}

/**
 * Break a subgraph out of a parent graph
 * @param graph Graph to break up
 * @param nodes The nodes to include in the inner graph
 * @returns Inner graph containing only the provided nodes & their edges,
 *          and an outer graph with the inner edges removed.
 *          Note that the inner nodes will remain in the outer graph.
 */
function breakoutNodes(
  graph: CFGGraph,
  nodes: string[],
): { outer: CFGGraph; inner: CFGGraph } {
  const outerGraph = graph.copy();
  const innerGraph = subgraph(graph, nodes);
  innerGraph.forEachEdge((_edge, _attributes, source, target) => {
    outerGraph.dropEdge(source, target);
  });
  return { outer: outerGraph, inner: innerGraph };
}
type Hierarchy = {
  graph: CFGGraph;
  children: { [key: ClusterId]: Hierarchy };
  cluster?: Cluster;
};
function buildHierarchy(cfg: CFG): Hierarchy {
  /*
  1. Go through the nodes and collect the clusterset->node mapping
    a. Clustersets should be converted to array and sorted
  2. Sort all clustersets from longest (deepest) to shortest (shallowest)
  3. Break  out the clusters
  4. Construct cluster hierarchy

  alternatively, construct cluster hierarchy while creating the CFG, 
  then use that hierarchy (traversing from the leaves up) to breakout and next clusters.

  Second option is better.
  */
  const hierarchy: Hierarchy = { graph: cfg.graph, children: {} };

  const clusterNodes: Map<Cluster, string[]> = new Map();
  cfg.graph.forEachNode((node, { cluster }) => {
    if (cluster) {
      const nodesList = clusterNodes.get(cluster);
      if (nodesList) nodesList.push(node);
      else clusterNodes.set(cluster, [node]);
    }
  });

  // The clusters must be sorted to simplify building the hierarchy.
  // If they are not, we need to ensure we don't overwrite the children object of a parent with existing children.
  for (const [cluster, nodes] of [...clusterNodes.entries()].toSorted(
    ([clusterA, _nodesA], [clusterB, _nodesB]) =>
      clusterA.depth - clusterB.depth,
  )) {
    let currentParent = hierarchy;
    for (const parent of getParents(cluster)) {
      // We can't be sure the parents exist as some clusters may have no nodes of their own.
      currentParent = currentParent.children[parent.id] ??= {
        // Clusters only get a graph when breaking out nodes.
        graph: new MultiDirectedGraph(),
        children: {},
        cluster: parent,
      };
    }
    const { outer, inner } = breakoutNodes(hierarchy.graph, nodes);
    hierarchy.graph = outer;
    // We know we can savely create this as we're going from shallow to deep.
    currentParent.children[cluster.id] = {
      graph: inner,
      children: {},
      cluster: cluster,
    };
  }

  // cfg.graph.forEachNode((node, { cluster }) => {
  //   console.log(node, cluster?.id ?? "toplevel");
  // });
  // for (const [cluster, nodes] of clusterNodes.entries()) {
  //   console.log(cluster.id, nodes);
  // }
  // for (const cluster of clusterNodes.keys()) {
  //   console.log(cluster.id, getParents(cluster).map(c => c.id))
  // }
  // _showHierarchy(hierarchy);
  return hierarchy;
}

function _showHierarchy(hierarchy: Hierarchy) {
  const stack: [Hierarchy, number][] = [[hierarchy, 0]];
  const spaces = "                                           ";
  for (
    let [current, depth] = stack.pop() ?? [];
    current !== undefined && depth !== undefined;
    [current, depth] = stack.pop() ?? []
  ) {
    console.log(
      `${spaces.slice(0, depth * 4)}${current.cluster?.id ?? "toplevel"}-${current.cluster?.type ?? "X"}: ${current.graph.nodes()}`,
    );
    const children = [...Object.values(current.children)];
    const next: [Hierarchy, number][] = children.map((h) => [h, depth + 1]);
    stack.push(...next);
  }
}

function getParents(cluster: Cluster) {
  const parents = [];
  while (cluster.parent) {
    cluster = cluster.parent;
    parents.push(cluster);
  }
  return parents.toReversed();
}

function renderHierarchy(
  cfg: CFG,
  hierarchy: Hierarchy,
  context: RenderContext,
) {
  let dotContent = `digraph "" {\n    node [shape=box];\n    edge [headport=n tailport=s]\n    bgcolor="transparent"\n`;

  const topGraph = cfg.graph;

  // First we draw all subgraphs
  for (const child of Object.values(hierarchy.children)) {
    dotContent += renderSubgraphs(child, context, topGraph);
  }

  // Then everything that remains - connecting edges and non-clustered nodes
  hierarchy.graph.forEachNode((node) => {
    dotContent += renderNode(topGraph, node, context);
  });
  hierarchy.graph.forEachEdge((edge, _attributes, source, target) => {
    dotContent += renderEdge(edge, source, target, topGraph, context);
  });

  dotContent += "}";
  return dotContent;
}

function renderSubgraphs(
  hierarchy: Hierarchy,
  context: RenderContext,
  topGraph: CFGGraph,
) {
  let dotContent = "";
  dotContent += `subgraph cluster_${hierarchy.cluster?.id ?? "toplevel"} {\n`;
  if (hierarchy.cluster) dotContent += clusterStyle(hierarchy.cluster);
  hierarchy.graph.forEachNode((node) => {
    dotContent += renderNode(topGraph, node, context);
  });
  for (const child of Object.values(hierarchy.children)) {
    dotContent += `\n${renderSubgraphs(child, context, topGraph)}\n`;
  }
  hierarchy.graph.forEachEdge((edge, _attributes, source, target) => {
    dotContent += renderEdge(edge, source, target, topGraph, context);
  });
  dotContent += "\n}";
  return dotContent;
}

export function graphToDot(cfg: CFG, verbose: boolean = false): string {
  const hierarchy = buildHierarchy(cfg);
  const backlinks = detectBacklinks(cfg.graph, cfg.entry);
  return renderHierarchy(cfg, hierarchy, new RenderContext(verbose, backlinks));
}

type DotAttributes = { [attribute: string]: number | string | undefined };
function formatStyle(style: DotAttributes): string {
  return [...Object.entries(style)]
    .map(([name, value]) => {
      switch (typeof value) {
        case "number":
          return `${name}=${value};\n`;
        case "string":
          return `${name}="${value}";\n`;
        case "undefined":
          return "";
      }
    })
    .join("");
}

function clusterStyle(cluster: Cluster): string {
  const isSelfNested = cluster.type === cluster.parent?.type;
  const penwidth = isSelfNested ? 6 : 0;
  const color = "white";
  switch (cluster.type) {
    case "with":
      return formatStyle({ penwidth, color, bgcolor: "#ffddff" });
    case "try-complex":
      return formatStyle({ penwidth, color, bgcolor: "#ddddff" });
    case "try":
      return formatStyle({ penwidth, color, bgcolor: "#ddffdd" });
    case "finally":
      return formatStyle({ penwidth, color, bgcolor: "#ffffdd" });
    case "except":
      return formatStyle({ penwidth, color, bgcolor: "#ffdddd" });
    default:
      return "";
  }
}

function renderEdge(
  edge: string,
  source: string,
  target: string,
  topGraph: CFGGraph,
  context: RenderContext,
) {
  const attributes = topGraph.getEdgeAttributes(edge);
  const dotAttrs: DotAttributes = {};
  dotAttrs.penwidth = context.isBacklink(source, target) ? 2 : 1;
  dotAttrs.color = "blue";
  switch (attributes.type) {
    case "consequence":
      dotAttrs.color = "green";
      break;
    case "alternative":
      dotAttrs.color = "red";
      break;
    case "regular":
      dotAttrs.color = "blue";
      break;
    case "exception":
      dotAttrs.style = "invis";
      dotAttrs.headport = "e";
      dotAttrs.tailport = "w";
      break;
    default:
      dotAttrs.color = "fuchsia";
  }
  return `    ${source} -> ${target} [${formatStyle(dotAttrs)}];\n`;
}

function renderNode(
  graph: CFGGraph,
  node: string,
  context: RenderContext,
): string {
  const dotAttrs: DotAttributes = {};
  dotAttrs.style = "filled";
  dotAttrs.label = "";
  const nodeAttrs = graph.getNodeAttributes(node);
  if (context.verbose) {
    dotAttrs.label = `${node} ${nodeAttrs.type} ${graph.getNodeAttributes(node).code.replaceAll('"', '\\"')}`;

    const clusterAttrs = graph.getNodeAttribute(node, "cluster");
    dotAttrs.label = `${clusterAttrs?.id} ${clusterAttrs?.type}\n${dotAttrs.label}`;
  }
  dotAttrs.shape = "box";
  dotAttrs.fillcolor = "lightgray";
  let minHeight = 0.2;
  if (graph.degree(node) === 0) {
    dotAttrs.minHeight = 0.5;
  } else if (graph.inDegree(node) === 0) {
    dotAttrs.shape = "invhouse";
    dotAttrs.fillcolor = "#48AB30";
    minHeight = 0.5;
  } else if (graph.outDegree(node) === 0) {
    dotAttrs.shape = "house";
    dotAttrs.fillcolor = "#AB3030";
    minHeight = 0.5;
  }
  switch (nodeAttrs.type) {
    case "THROW":
      dotAttrs.shape = "triangle";
      dotAttrs.fillcolor = "#fdd";
      break;
    case "YIELD":
      dotAttrs.shape = "hexagon";
      dotAttrs.orientation = 90;
      dotAttrs.fillcolor = "deepskyblue";
      break;
  }

  dotAttrs.height = Math.max(
    graph.getNodeAttribute(node, "lines") * 0.3,
    minHeight,
  );
  return `    ${node} [${formatStyle(dotAttrs)}];\n`;
}
