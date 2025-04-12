import {
  type EdgeModel,
  type NodeModel,
  type RootGraphModel,
  type SubgraphModel,
  attribute,
  fromDot,
  toDot,
} from "ts-graphviz";
import type { ColorScheme } from "../control-flow/colors.ts";
import {
  getEdgeDefaultStyle,
  getEdgeStyle,
  getNodeHeight,
  getNodeStyle,
  isEdgeClass,
  isNodeClass,
} from "./theme.ts";

/**
 * Get the classes for a given edge or node
 * @param item The edge or node
 * @param defaultClass A default class name to use if no classes are found
 */
function getClasses(
  item: NodeModel | EdgeModel,
  defaultClass: string,
): string[] {
  type ClassGetter = (key: (typeof attribute)["class"]) => string | undefined;
  const classGetter: ClassGetter = item.attributes.get.bind(item.attributes);
  const classString = classGetter(attribute.class);
  return (classString ?? defaultClass).split(/\s/);
}

export function applyTheme(dot: string, colorScheme: ColorScheme): string {
  const G = fromDot(dot);
  G.apply({
    [attribute.bgcolor]: colorScheme["graph.background"],
  });
  const nodeAttrs = getNodeStyle("default", colorScheme);
  nodeAttrs.fontname = "sans-serif";
  nodeAttrs.height = getNodeHeight("default", 0);
  G.node(nodeAttrs);
  G.edge(getEdgeDefaultStyle(colorScheme));

  for (const node of iterAllNodes(G)) {
    for (const cls of getClasses(node, "default")) {
      if (isNodeClass(cls)) {
        node.attributes.apply(getNodeStyle(cls, colorScheme));
        const height = node.attributes.get("height");
        let lines = 0;
        if (typeof height === "number") {
          lines = height;
        } else if (typeof height === "string") {
          lines = Number.parseInt(height);
        }
        node.attributes.set("height", getNodeHeight(cls, lines));
      }
    }
  }

  for (const edge of iterAllEdges(G)) {
    const isBacklink = edge.attributes.get(attribute.dir) === "back";
    if (isBacklink) {
      edge.targets.reverse();
    }

    for (const cls of getClasses(edge, "regular")) {
      if (isEdgeClass(cls)) {
        edge.attributes.apply(getEdgeStyle(cls, isBacklink, colorScheme));
      }
    }
  }
  return toDot(G);
}

function* iterAllNodes(G: RootGraphModel) {
  const stack: Array<RootGraphModel | SubgraphModel> = [G];
  for (;;) {
    const graph = stack.pop();
    if (!graph) {
      break;
    }
    stack.push(...graph.subgraphs);
    yield* graph.nodes;
  }
}

function* iterAllEdges(G: RootGraphModel) {
  const stack: Array<RootGraphModel | SubgraphModel> = [G];
  for (;;) {
    const graph = stack.pop();
    if (!graph) {
      break;
    }
    stack.push(...graph.subgraphs);
    yield* graph.edges;
  }
}
