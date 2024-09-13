import { distanceFromEntry } from "./graph-ops";
import type { CFG, CFGGraph, Cluster, ClusterId } from "./cfg-defs";
import { subgraph } from "graphology-operators";

function breakoutNodes(graph: CFGGraph, nodes: string[]): { outer: CFGGraph, inner: CFGGraph } {
  const outerGraph = graph.copy();
  const innerGraph = subgraph(graph, nodes);
  innerGraph.forEachEdge((_edge, _attributes, source, target) => {
    outerGraph.dropEdge(source, target);
  });
  return { outer: outerGraph, inner: innerGraph };
}
type hGraph = {
  graph: CFGGraph, children: { [key: ClusterId]: hGraph }, id?: ClusterId
};
function processClusters(cfg: CFG) {
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
  const hierarchy: hGraph = { graph: cfg.graph, children: {} };
  if (!cfg.clusters) {
    return hierarchy;
  }

  // Sort from deepest to shallowest
  const clusters = cfg.clusters.toSorted((a, b) => b.depth - a.depth);
  const clusterNodes = new Map();
  cfg.graph.forEachNode((node, { cluster }) => {
    if (cluster) {
      const nodesList = clusterNodes.get(cluster.id);
      if (nodesList) nodesList.push(node);
      else clusterNodes.set(cluster.id, [node]);
    }
  });


  console.log("node clusters", clusterNodes);

  // Starting from the top-most cluster
  for (const cluster of clusters.toReversed()) {
    // Get to the parent of the current cluster
    let currentParent = hierarchy;
    for (const parent of getParents(cluster)) {
      currentParent = currentParent.children[parent.id] ??= { graph: currentParent.graph, children: {}, id: parent.id };
    }
    // Break out the nodes and update the graphs
    const { outer, inner } = breakoutNodes(currentParent.graph, clusterNodes.get(cluster.id));
    currentParent.graph = outer;
    currentParent.children[cluster.id] = { graph: inner, children: {}, id: cluster.id };
  }

  return hierarchy;
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
    label = `${graph.getNodeAttribute(node, "cluster")?.id}`
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

function renderHierarchy(cfg: CFG, hierarchy: hGraph, verbose: boolean = false) {
  let dotContent = `digraph "" {\n    node [shape=box];\n    edge [headport=n tailport=s]\n    bgcolor="transparent"\n`;

  const graph = cfg.graph;

  console.log("hierarchy", hierarchy);

  // First we define all the nodes
  graph.forEachNode((node) => {
    dotContent += renderNode(graph, node, verbose);
  });

  // Then we start drawing the subgraphs
  for (const child of Object.values(hierarchy.children)) {
    dotContent += renderSubgraphs(child);
  }
  hierarchy.graph.forEachEdge((_edge, _attributes, source, target) => {
    dotContent += `${source} -> ${target};\n`
  })
  // And eventually we draw all non-subgraph edges - are there any?

  dotContent += "}";
  return dotContent;
}

function renderSubgraphs(hierarchy: hGraph) {
  let dotContent = `subgraph cluster_${hierarchy.id ?? "toplevel"} {\n`
  for (const child of Object.values(hierarchy.children)) {
    dotContent += `\n${renderSubgraphs(child)}\n`;
  }
  hierarchy.graph.forEachEdge((_edge, _attributes, source, target) => {
    dotContent += `${source} -> ${target};\n`
  })
  dotContent += "\n}";
  return dotContent;
}

export function graphToDot(cfg: CFG, verbose: boolean = false): string {
  const hierarchy = processClusters(cfg);
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
