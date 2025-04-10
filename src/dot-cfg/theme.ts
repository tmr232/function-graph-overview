import type { ColorScheme } from "../control-flow/colors.ts";
import type { EdgeAttributesObject, NodeAttributesObject } from "ts-graphviz";
import type { EdgeType } from "../control-flow/cfg-defs.ts";

export type NodeStyleType = "DEFAULT"|"SINGLE"|"ENTRY"|"EXIT"|"YIELD"|"THROW";
export function getNodeStyle(nodeType:NodeStyleType, lines:number, colorScheme:ColorScheme):NodeAttributesObject {
  let minHeight = 0.2;
  const dotAttrs :NodeAttributesObject = {}
  dotAttrs.label="";
  dotAttrs.style="filled";
  dotAttrs.shape="box";
  dotAttrs.class="default";
  dotAttrs.fillcolor = colorScheme["node.default"];
  switch (nodeType) {
    case "SINGLE":
      minHeight = 0.5;
      break;
    case "ENTRY":
      dotAttrs.shape = "invhouse";
      dotAttrs.class = "entry";
      dotAttrs.fillcolor = colorScheme["node.entry"];
      minHeight = 0.5;
      break;
      case "EXIT":
        dotAttrs.shape = "house";
        dotAttrs.class = "exit";
        dotAttrs.fillcolor = colorScheme["node.exit"];
        minHeight = 0.5;
        break;
    case "THROW":
      dotAttrs.shape = "triangle";
      dotAttrs.class = "throw";
      dotAttrs.fillcolor = colorScheme["node.throw"];
      break;
    case "YIELD":
      dotAttrs.shape = "hexagon";
      dotAttrs.orientation = 90;
      dotAttrs.class = "yield";
      dotAttrs.fillcolor = colorScheme["node.yield"];
      break;
  }
  dotAttrs.height = Math.max(lines * 0.3, minHeight);
  return dotAttrs;
}

export function getEdgeStyle(edgeType:EdgeType, isBacklink:boolean,  colorScheme:ColorScheme):EdgeAttributesObject {
  const dotAttrs: EdgeAttributesObject = {};
  dotAttrs.penwidth = isBacklink ? 2 : 1;
  dotAttrs.color = colorScheme["edge.regular"];
  switch (edgeType) {
    case "consequence":
      dotAttrs.class = "consequence";
      dotAttrs.color = colorScheme["edge.consequence"];
      break;
    case "alternative":
      dotAttrs.class = "alternative";
      dotAttrs.color = colorScheme["edge.alternative"];
      break;
    case "regular":
      dotAttrs.class = "regular";
      dotAttrs.color = colorScheme["edge.regular"];
      break;
    case "exception":
      dotAttrs.style = "invis";
      dotAttrs.headport = "e";
      dotAttrs.tailport = "w";
      break;
    default:
      dotAttrs.color = "fuchsia";
  }
  if (isBacklink) {
    // For backlinks, we use `dir=back` to improve the layout.
    // This tells DOT that this is a backlink, and changes the ranking of nodes.
    dotAttrs.dir = "back";
    // To accommodate that, we also flip the node order and the ports.
    dotAttrs.headport = "s";
    dotAttrs.tailport = "n";
  }

  return dotAttrs;
}