import { distanceFromEntry } from "./graph-ops";
import type { CFG } from "./cfg-defs";

export function graphToDot(cfg: CFG, verbose: boolean = false): string {
  const graph = cfg.graph;
  let dotContent = `digraph "" {\n    node [shape=box];\n    edge [headport=n tailport=s]\n    bgcolor="transparent"\n`;
  const levels = distanceFromEntry(cfg);
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
    if ((levels.get(source) ?? 0) > (levels.get(target) ?? 0)) {
      penwidth = 2;
    }
    dotContent += `    ${source} -> ${target} [penwidth=${penwidth} color=${color}];\n`;
  });

  dotContent += "}";
  return dotContent;
}
