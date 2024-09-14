import { distanceFromEntry } from "./graph-ops";
import type { CFG, CFGGraph, Cluster, ClusterId } from "./cfg-defs";
import { subgraph } from "graphology-operators";
import { MultiDirectedGraph } from "graphology";

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
  // showHierarchy(hierarchy);
  return hierarchy;
}

function showHierarchy(hierarchy: Hierarchy) {
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

function renderNode(graph: CFGGraph, node: string, verbose: boolean): string {
  let label = "";
  if (verbose) {
    label = `${node} ${graph.getNodeAttributes(node).type} ${graph.getNodeAttributes(node).code}`;

    const clusterAttrs = graph.getNodeAttribute(node, "cluster")
    label = `${clusterAttrs?.id} ${clusterAttrs?.type}\n${label}`;
  }
  let shape = "box";
  let fillColor = "lightgray";
  let minHeight = 0.2;
  if (graph.degree(node) === 0) {
    minHeight = 0.5;
  } else if (graph.inDegree(node) === 0) {
    shape = "invhouse";
    fillColor = "#48AB30";
    minHeight = 0.5;
  } else if (graph.outDegree(node) === 0) {
    shape = "house";
    fillColor = "#AB3030";
    minHeight = 0.5;
  }

  const height = Math.max(
    graph.getNodeAttribute(node, "lines") * 0.3,
    minHeight,
  );
  return `    ${node} [label="${label}" shape="${shape}" fillcolor="${fillColor}" style="filled" height=${height}];\n`;
}

function renderHierarchy(
  cfg: CFG,
  hierarchy: Hierarchy,
  verbose: boolean = false,
) {
  let dotContent = `digraph "" {\n    node [shape=box];\n    edge [headport=n tailport=s]\n    bgcolor="transparent"\n`;

  const topGraph = cfg.graph;

  // First we draw all subgraphs
  for (const child of Object.values(hierarchy.children)) {
    dotContent += renderSubgraphs(child, verbose, topGraph);
  }

  // Then everything that remains - connecting edges and non-clustered nodes
  hierarchy.graph.forEachNode((node) => {
    dotContent += renderNode(topGraph, node, verbose);
  });
  hierarchy.graph.forEachEdge((edge, _attributes, source, target) => {
    dotContent += renderEdge(edge, source, target, topGraph);
  });

  dotContent += "}";
  return dotContent;
}

function formatStyle(style: { [attribute: string]: number | string }): string {
  return [...Object.entries(style)]
    .map(([name, value]) => {
      switch (typeof value) {
        case "number":
          return `${name}=${value};\n`;
        case "string":
          return `${name}="${value}";\n`;
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
    default:
      return "";
  }
}

function renderSubgraphs(
  hierarchy: Hierarchy,
  verbose: boolean,
  topGraph: CFGGraph,
) {
  let dotContent = ""
  if (hierarchy.cluster?.type !== "try") {
    dotContent += `subgraph cluster_${hierarchy.cluster?.id ?? "toplevel"} {\n`;
    if (hierarchy.cluster) dotContent += clusterStyle(hierarchy.cluster);
  }
  hierarchy.graph.forEachNode((node) => {
    dotContent += renderNode(topGraph, node, verbose);
  });
  for (const child of Object.values(hierarchy.children)) {
    dotContent += `\n${renderSubgraphs(child, verbose, topGraph)}\n`;
  }
  hierarchy.graph.forEachEdge((edge, _attributes, source, target) => {
    dotContent += renderEdge(edge, source, target, topGraph);
  });
  if (hierarchy.cluster?.type !== "try") {
    dotContent += "\n}";
  }
  return dotContent;
}

export function graphToDot(cfg: CFG, verbose: boolean = false): string {
  const hierarchy = buildHierarchy(cfg);
  return renderHierarchy(cfg, hierarchy, verbose);

  const graph = cfg.graph;
  let dotContent = `digraph "" {\n    node [shape=box];\n    edge [headport=n tailport=s]\n    bgcolor="transparent"\n`;
  const levels = distanceFromEntry(cfg);
  /*
  To draw clusters, we need to do as follows:

  1. Generate a subgraph for every cluster-set, and nest them based on cluster-count
  2. Remove the inner cluster edges from the parent graph (node need to remain, for the out/in-going edges)
  3. Draw them all
  */
  graph.forEachNode((node) => {
    let label = "";
    if (verbose) {
      label = `${node} ${graph.getNodeAttributes(node).type} ${graph.getNodeAttributes(node).code}`;
    }
    // const label = "";
    //     .replace(/"/g, '\\"')
    //     .replace(/\n/g, "\\n");

    // const label = `${graph.getNodeAttribute(node, "line") || ""}`;
    // label = `${levels.get(node)}`;
    // label = `${graph.getNodeAttribute(node, "markers")}`;

    let shape = "box";
    let fillColor = "lightgray";
    let minHeight = 0.2;
    if (graph.degree(node) === 0) {
      minHeight = 0.5;
    } else if (graph.inDegree(node) === 0) {
      shape = "invhouse";
      fillColor = "#48AB30";
      minHeight = 0.5;
    } else if (graph.outDegree(node) === 0) {
      shape = "house";
      fillColor = "#AB3030";
      minHeight = 0.5;
    }

    const height = Math.max(
      graph.getNodeAttribute(node, "lines") * 0.3,
      minHeight,
    );
    dotContent += `    ${node} [label="${label}" shape="${shape}" fillcolor="${fillColor}" style="filled" height=${height}];\n`;
  });

  graph.forEachEdge((edge, attributes, source, target) => {
    let penwidth = 1;
    let color = "blue";
    switch (attributes.type) {
      case "consequence":
        color = "green";
        break;
      case "alternative":
        color = "red";
        break;
      default:
        color = "blue";
    }
    // if (graph.getNodeAttribute(source, "line") > graph.getNodeAttribute(target, "line")) {
    //     penwidth = 2;
    // }
    // TODO: Use line numbers to detect backlinks
    if ((levels.get(source) ?? 0) > (levels.get(target) ?? 0)) {
      penwidth = 2;
    }
    dotContent += `    ${source} -> ${target} [penwidth=${penwidth} color=${color}];\n`;
  });

  dotContent += "}";
  return dotContent;
}

function renderEdge(
  edge: string,
  source: string,
  target: string,
  topGraph: CFGGraph,
) {
  const attributes = topGraph.getEdgeAttributes(edge);
  const penwidth = 1;
  let color = "blue";
  switch (attributes.type) {
    case "consequence":
      color = "green";
      break;
    case "alternative":
      color = "red";
      break;
    default:
      color = "blue";
  }
  return `    ${source} -> ${target} [penwidth=${penwidth} color=${color}];\n`;
}
