import { fromDot, attribute, toDot, type NodeAttributesObject, type EdgeAttributesObject, Edge } from "ts-graphviz";
import { type ColorScheme, getDefaultColorScheme } from "../src/control-flow/colors.ts";


function getNodeAttributes(colorScheme:ColorScheme) {
  const nodeAttributes: { [key: string]: NodeAttributesObject } = {
    entry: {
      [attribute.fillcolor]: colorScheme["node.entry"],
      [attribute.shape]: "invhouse",
    },
    exit: {
      [attribute.fillcolor]: colorScheme["node.exit"],
      [attribute.shape]: "house"
    },
    "throw": {
      [attribute.fillcolor]: colorScheme["node.throw"],
      [attribute.shape]: "triangle"
    },
    "yield": {
      [attribute.fillcolor]: colorScheme["node.yield"],
      [attribute.shape]: "hexagon",
      [attribute.orientation]: "90"
    }
  }

  return nodeAttributes;
}

function getEdgeClassAttributes(colorScheme:ColorScheme) {
  const edgeAttributes: { [key: string]: EdgeAttributesObject } = {
    consequence: {
      [attribute.color]: colorScheme["edge.consequence"],
    },
    alternative: {
      [attribute.color]: colorScheme["edge.alternative"],
    },
    exception: {
      [attribute.style]: "invis",
      [attribute.headport]:"e",
      [attribute.tailport]:"w",
    },
  }

  return edgeAttributes;
}

export function applyTheme(dot:string, colorScheme:ColorScheme):string {
  const G = fromDot(dot);
  G.apply({
    [attribute.bgcolor]:colorScheme["graph.background"],
  })
  G.node({
    [attribute.style]:"filled",
    [attribute.label]:"",
    [attribute.shape]:"box",
    [attribute.fillcolor]:colorScheme["node.default"],
    [attribute.color]:colorScheme["node.border"],
  });
  G.edge({
    [attribute.color]:colorScheme["edge.regular"],
    [attribute.headport]:"n",
    [attribute.tailport]:"s",
    [attribute.penwidth]:1,
  })


  const allNodeAttributes = getNodeAttributes(colorScheme);
  for (const node of G.nodes) {
    for (const cls of (node.attributes.get(attribute.class)??"").split(/\s/)) {
      const attrObj = allNodeAttributes[cls];
      if (attrObj) {
        node.attributes.apply(attrObj);
      }
    }
  }

  const edgeClassAttributes = getEdgeClassAttributes(colorScheme);
  for (const edge of G.edges) {
    for (const cls of (edge.attributes.get(attribute.class)??"").split(/\s/)) {
      const attrObj = edgeClassAttributes[cls];
      if (attrObj) {
        edge.attributes.apply(attrObj);
      }
    }
    if (edge.attributes.get(attribute.dir) === "back") {
      edge.attributes.apply({
        [attribute.penwidth]:2,
        [attribute.headport]:"s",
        [attribute.tailport]:"n",
      });
      edge.targets.reverse();
    }
  }

  return toDot(G);
}

console.log(applyTheme(  `digraph {
    a [class="entry"]
    b [class="exit"]
    a -> b [class="default"]
    b -> a [class="alternative" dir="back"]
  }`, getDefaultColorScheme()))