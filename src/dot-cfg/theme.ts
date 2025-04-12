import type { EdgeAttributesObject, NodeAttributesObject } from "ts-graphviz";
import type { ColorScheme } from "../control-flow/colors.ts";

const NodeClasses = ["default", "entry", "exit", "yield", "throw"] as const;
export type NodeClass = (typeof NodeClasses)[number];
export function isNodeClass(name: string): name is NodeClass {
  return NodeClasses.includes(name as NodeClass);
}
const EdgeClasses = ["consequence", "alternative", "regular", "exception"];
export type EdgeClass = (typeof EdgeClasses)[number];
export function isEdgeClass(name: string): name is EdgeClass {
  return EdgeClasses.includes(name as EdgeClass);
}
const nodeStyles: Record<NodeClass, NodeAttributesObject> = {
  default: {
    label: "",
    style: "filled",
    shape: "box",
    class: "default",
  },
  entry: {
    shape: "invhouse",
    class: "entry",
  },
  exit: {
    shape: "house",
    class: "exit",
  },
  throw: {
    shape: "triangle",
    class: "throw",
  },
  yield: {
    shape: "hexagon",
    orientation: 90,
    class: "yield",
  },
};

export function getNodeStyle(
  nodeClass: NodeClass,
  colorScheme: ColorScheme,
): NodeAttributesObject {
  const dotAttrs: NodeAttributesObject = structuredClone(nodeStyles[nodeClass]);
  dotAttrs.fillcolor = colorScheme[`node.${nodeClass}`];
  dotAttrs.color = colorScheme["node.border"];
  return dotAttrs;
}

export function getNodeHeight(nodeClass: NodeClass, lines: number): number {
  let minHeight = 0.3;
  if (["entry", "exit"].includes(nodeClass)) {
    minHeight = 0.5;
  }
  return Math.max(lines * 0.3, minHeight);
}

export function getEdgeDefaultStyle(
  colorScheme: ColorScheme,
): EdgeAttributesObject {
  const dotAttrs: EdgeAttributesObject = {};
  dotAttrs.penwidth = 1;
  dotAttrs.color = colorScheme["edge.regular"];
  dotAttrs.headport = "n";
  dotAttrs.tailport = "s";
  return dotAttrs;
}

export function getEdgeStyle(
  edgeClass: EdgeClass,
  isBacklink: boolean,
  colorScheme: ColorScheme,
): EdgeAttributesObject {
  const dotAttrs: EdgeAttributesObject = {};
  switch (edgeClass) {
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
    dotAttrs.penwidth = 2;
    // For backlinks, we use `dir=back` to improve the layout.
    // This tells DOT that this is a backlink, and changes the ranking of nodes.
    dotAttrs.dir = "back";
    // To accommodate that, we also flip the node order and the ports.
    dotAttrs.headport = "s";
    dotAttrs.tailport = "n";
  }

  return dotAttrs;
}
