import { MultiDirectedGraph } from "graphology";
import { subgraph } from "graphology-operators";
import type { CFG, CFGGraph, Cluster, ClusterId } from "./cfg-defs";
import { type ColorScheme, getDefaultColorScheme } from "./colors";
import { detectBacklinks } from "./graph-ops";
import { getEdgeStyle, getNodeStyle, type NodeStyleType } from "../dot-cfg/theme.ts";

function indent(text: string): string {
  return (
    text
      .split(/\n/)
      // We only indent non-empty lines
      .map((line) => (line ? `    ${line}` : ""))
      .join("\n")
  );
}

class RenderContext {
  public readonly verbose: boolean;
  private readonly backlinks: { from: string; to: string }[];
  public readonly colorScheme: ColorScheme;
  constructor(
    verbose: boolean,
    backlinks: { from: string; to: string }[],
    colorScheme: ColorScheme,
  ) {
    this.verbose = verbose;
    this.backlinks = backlinks;
    this.colorScheme = colorScheme;
  }

  public isBacklink(from: string, to: string): boolean {
    return this.backlinks.some(
      (backlink) => from === backlink.from && to === backlink.to,
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
    const children = Object.values(current.children);
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
  const parts: string[] = [];
  parts.push(
    `digraph "" {\n    node [shape=box, color="${context.colorScheme["node.border"]}"];\n    edge [headport=n tailport=s]\n    bgcolor="${context.colorScheme["graph.background"]}"`,
  );

  const topGraph = cfg.graph;

  // First we draw all subgraphs
  for (const child of Object.values(hierarchy.children)) {
    parts.push(indent(renderSubgraphs(child, context, topGraph)));
  }

  // Then everything that remains - connecting edges and non-clustered nodes
  hierarchy.graph.forEachNode((node) => {
    parts.push(indent(renderNode(topGraph, node, context)));
  });
  hierarchy.graph.forEachEdge((edge, _attributes, source, target) => {
    parts.push(indent(renderEdge(edge, source, target, topGraph, context)));
  });

  parts.push("}");
  return parts.join("\n");
}

function renderSubgraphs(
  hierarchy: Hierarchy,
  context: RenderContext,
  topGraph: CFGGraph,
) {
  const parts: string[] = [];

  parts.push(`subgraph cluster_${hierarchy.cluster?.id ?? "toplevel"} {`);
  if (hierarchy.cluster)
    parts.push(indent(clusterStyle(hierarchy.cluster, context)));
  hierarchy.graph.forEachNode((node) => {
    parts.push(indent(renderNode(topGraph, node, context)));
  });
  for (const child of Object.values(hierarchy.children)) {
    parts.push(indent(`${renderSubgraphs(child, context, topGraph)}`));
  }
  hierarchy.graph.forEachEdge((edge, _attributes, source, target) => {
    parts.push(indent(renderEdge(edge, source, target, topGraph, context)));
  });
  parts.push("}");

  return parts.join("\n");
}

export function graphToDot(
  cfg: CFG,
  verbose = false,
  colorScheme?: ColorScheme,
): string {
  const hierarchy = buildHierarchy(cfg);
  const backlinks = detectBacklinks(cfg.graph, cfg.entry);
  return renderHierarchy(
    cfg,
    hierarchy,
    new RenderContext(
      verbose,
      backlinks,
      colorScheme ?? getDefaultColorScheme(),
    ),
  );
}

type DotAttributes = { [attribute: string]: number | string | undefined|boolean };
function formatStyle(style: DotAttributes): string {
  return Object.entries(style)
    .map(([name, value]) => {
      switch (typeof value) {
        case "number":
          return `${name}=${value}`;
        case "string":
          return `${name}="${value}"`;
        default: // case "undefined":
          return "";
      }
    })
    .filter(Boolean)
    .join("; ");
}

function clusterStyle(cluster: Cluster, context: RenderContext): string {
  const isSelfNested = cluster.type === cluster.parent?.type;
  const penwidth = isSelfNested ? 6 : 0;
  const color = context.colorScheme["cluster.border"];
  switch (cluster.type) {
    case "with":
      return formatStyle({
        penwidth,
        color,
        bgcolor: context.colorScheme["cluster.with"],
        class: "with",
      });
    case "try-complex":
      return formatStyle({
        penwidth,
        color,
        bgcolor: context.colorScheme["cluster.tryComplex"],
        class: "tryComplex",
      });
    case "try":
      return formatStyle({
        penwidth,
        color,
        bgcolor: context.colorScheme["cluster.try"],
        class: "try",
      });
    case "finally":
      return formatStyle({
        penwidth,
        color,
        bgcolor: context.colorScheme["cluster.finally"],
        class: "finally",
      });
    case "except":
      return formatStyle({
        penwidth,
        color,
        bgcolor: context.colorScheme["cluster.except"],
        class: "except",
      });
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
  const isBacklink = context.isBacklink(source, target);
 const dotAttrs = getEdgeStyle(attributes.type, isBacklink, context.colorScheme);
  if (isBacklink) {
    // To accommodate that, we also flip the node order and the ports.
    [source, target] = [target, source];
  }
  return `${source} -> ${target} [${formatStyle(dotAttrs)}];`;
}

function renderNode(
  graph: CFGGraph,
  node: string,
  context: RenderContext,
): string {
  const nodeAttrs = graph.getNodeAttributes(node);


  let nodeType:NodeStyleType = "DEFAULT";
  if (nodeAttrs.type === "THROW") {
    nodeType = "THROW"
  } else if (nodeAttrs.type === "YIELD") {
    nodeType = "YIELD";
  } else if (graph.degree(node)===0) {
    nodeType = "SINGLE";
  } else if (graph.inDegree(node)===0) {
    nodeType = "ENTRY";
  } else if (graph.outDegree(node)===0) {
    nodeType = "EXIT";
  }
  const dotAttrs = getNodeStyle(nodeType,graph.getNodeAttribute(node, "lines"), context.colorScheme );

  // This is needed to rename nodes for go-to-line
  dotAttrs.id = `${node}`;
  if (context.verbose) {
    dotAttrs.label = `${node} ${nodeAttrs.type} ${graph.getNodeAttributes(node).code.replaceAll('"', '\\"')}`;

    const clusterAttrs = graph.getNodeAttribute(node, "cluster");
    dotAttrs.label = `${clusterAttrs?.id} ${clusterAttrs?.type}\n${dotAttrs.label}`;
  }
  return `${node} [${formatStyle(dotAttrs)}];`;
}
