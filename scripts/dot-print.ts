import * as LZString from "lz-string";
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import {
  type EdgeAttributesObject,
  type EdgeModel,
  type NodeAttributesObject,
  type NodeModel,
  attribute,
  fromDot,
  toDot,
} from "ts-graphviz";
import {
  type ColorScheme,
  getDefaultColorScheme,
} from "../src/control-flow/colors.ts";

function getNodeAttributes(colorScheme: ColorScheme) {
  const nodeAttributes: { [key: string]: NodeAttributesObject } = {
    entry: {
      [attribute.fillcolor]: colorScheme["node.entry"],
      [attribute.shape]: "invhouse",
      [attribute.height]: 0.5,
    },
    exit: {
      [attribute.fillcolor]: colorScheme["node.exit"],
      [attribute.shape]: "house",
      [attribute.height]: 0.5,
    },
    throw: {
      [attribute.fillcolor]: colorScheme["node.throw"],
      [attribute.shape]: "triangle",
    },
    yield: {
      [attribute.fillcolor]: colorScheme["node.yield"],
      [attribute.shape]: "hexagon",
      [attribute.orientation]: "90",
    },
  };

  return nodeAttributes;
}

function getEdgeClassAttributes(colorScheme: ColorScheme) {
  const edgeAttributes: { [key: string]: EdgeAttributesObject } = {
    consequence: {
      [attribute.color]: colorScheme["edge.consequence"],
    },
    alternative: {
      [attribute.color]: colorScheme["edge.alternative"],
    },
    exception: {
      [attribute.style]: "invis",
      [attribute.headport]: "e",
      [attribute.tailport]: "w",
    },
  };

  return edgeAttributes;
}

function getClasses(item: NodeModel | EdgeModel): string[] {
  type ClassGetter = (key: (typeof attribute)["class"]) => string | undefined;
  const classGetter: ClassGetter = item.attributes.get.bind(item.attributes);
  const classString = classGetter(attribute.class);
  return (classString ?? "").split(/\s/);
}

export function applyTheme(dot: string, colorScheme: ColorScheme): string {
  const G = fromDot(dot);
  G.apply({
    [attribute.bgcolor]: colorScheme["graph.background"],
  });
  G.node({
    [attribute.style]: "filled",
    [attribute.label]: "",
    [attribute.shape]: "box",
    [attribute.fillcolor]: colorScheme["node.default"],
    [attribute.color]: colorScheme["node.border"],
    [attribute.fontname]: "sans-serif",
    [attribute.height]: 0.3,
  });
  G.edge({
    [attribute.color]: colorScheme["edge.regular"],
    [attribute.headport]: "n",
    [attribute.tailport]: "s",
    [attribute.penwidth]: 1,
  });

  const allNodeAttributes = getNodeAttributes(colorScheme);
  for (const node of G.nodes) {
    for (const cls of getClasses(node)) {
      const attrObj = allNodeAttributes[cls];
      if (attrObj) {
        node.attributes.apply(attrObj);
      }
    }
  }

  const edgeClassAttributes = getEdgeClassAttributes(colorScheme);
  for (const edge of G.edges) {
    for (const cls of getClasses(edge)) {
      const attrObj = edgeClassAttributes[cls];
      if (attrObj) {
        edge.attributes.apply(attrObj);
      }
    }
    if (edge.attributes.get(attribute.dir) === "back") {
      edge.attributes.apply({
        [attribute.penwidth]: 2,
        [attribute.headport]: "s",
        [attribute.tailport]: "n",
      });
      edge.targets.reverse();
    }
  }

  return toDot(G);
}

function editDotLink(dot: string): string {
  return `https://dreampuf.github.io/GraphvizOnline/?compressed=${LZString.compressToEncodedURIComponent(dot)}`;
}

const graphExamples = {
  Condition: `
  a -> b [class="consequence"]
  a -> c [class="alternative"]
  b [label="True"]
  c [label="False"]
  `,
  Switch: `
  a -> b
  a -> c
  a -> d
  a -> e
  a -> f
  
  a -> x [class="alternative"]
  
  b -> x
  c -> x
  d -> x
  e -> x
  f -> x
  `,
  Entry: `
  a [class="entry"]
  a -> b
  b [style="invis"]
  `,
  Loop: `
  head -> body [class="consequence"]
  body -> head [dir=back]
  head -> exit [class="alternative"]
  `,
};

const gradual = [
  "body",
  `
  stmt1 -> stmt2
  stmt2 -> stmt3
  stmt3 -> stmt4
  `,
  `
  stmt1 -> then1 [class="consequence"]
  stmt1 -> else1 [class="alternative"]
  then1 -> stmt2
  else1 -> stmt2
  stmt2 -> stmt3
  stmt3 -> stmt4
  `,
  `
  return1 [class="exit"]
  stmt1 -> return1 [class="consequence"]
  stmt1 -> else1 [class="alternative"]
  else1 -> stmt2
  stmt2 -> stmt3
  stmt3 -> stmt4
  `,
  `
  return1 [class="exit"]
  return2 [class="exit"]
  stmt1 -> return1 [class="consequence"]
  stmt1 -> else1 [class="alternative"]
  else1 -> stmt2
  stmt2 -> return2 [class="consequence"]
  stmt2 -> else2 [class="alternative"]
  else2 -> stmt3
  stmt3 -> stmt4
  `,
  `
  return1 [class="exit"]
  return2 [class="exit"]
  stmt1 -> return1 [class="consequence"]
  stmt1 -> else1 [class="alternative"]
  else1 -> stmt2
  stmt2 -> return2 [class="consequence"]
  stmt2 -> else2 [class="alternative"]
  else2 -> stmt3
  stmt3 -> stmt4
  stmt4 -> stmt4 [dir="back"]
  `,
  `
  return1 [class="exit"]
  return2 [class="exit"]
  stmt1 -> return1 [class="consequence"]
  stmt1 -> else1 [class="alternative"]
  else1 -> stmt2
  stmt2 -> return2 [class="consequence"]
  stmt2 -> else2 [class="alternative"]
  else2 -> stmt3
  stmt3 -> stmt4_1
  stmt4_1 -> stmt4_2
  stmt4_2 -> stmt4_3
  stmt4_3 -> stmt4_4
  stmt4_4 -> stmt4_1 [dir="back"]
  `,
  `
  return1 [class="exit"]
  return2 [class="exit"]
  return4_2 [class="exit"]
  stmt1 -> return1 [class="consequence"]
  stmt1 -> else1 [class="alternative"]
  else1 -> stmt2
  stmt2 -> return2 [class="consequence"]
  stmt2 -> else2 [class="alternative"]
  else2 -> stmt3
  stmt3 -> stmt4_1
  stmt4_1 -> stmt4_2
  stmt4_2 -> return4_2 [class="consequence"]
  stmt4_2 -> else4_2 [class="alternative"]
  else4_2 -> stmt4_3
  stmt4_3 -> stmt4_4
  stmt4_4 -> stmt4_1 [dir="back"]
  `,
  `
  entry [class="entry"]
  return1 [class="exit"]
  return2 [class="exit"]
  return4_2 [class="exit"]
  entry -> stmt1
  stmt1 -> return1 [class="consequence"]
  stmt1 -> else1 [class="alternative"]
  else1 -> stmt2
  stmt2 -> return2 [class="consequence"]
  stmt2 -> else2 [class="alternative"]
  else2 -> stmt3
  stmt3 -> stmt4_1
  stmt4_1 -> stmt4_2
  stmt4_2 -> return4_2 [class="consequence"]
  stmt4_2 -> else4_2 [class="alternative"]
  else4_2 -> stmt4_3
  stmt4_3 -> stmt4_4
  stmt4_4 -> stmt4_1 [dir="back"]
  `
]

if (require.main === module) {
  // for (const [name, graphContent] of Object.entries(graphExamples)) {
  //   console.log(
  //     name,
  //     editDotLink(
  //       applyTheme(`digraph { ${graphContent} }`, getDefaultColorScheme()),
  //     ),
  //   );
  // }
  const graphviz = await Graphviz.load();
  for (let i=0; i<gradual.length; ++i){
    const step = gradual[i]
    const styledDot = applyTheme(`digraph { ${step} }`, getDefaultColorScheme());
    const svg = graphviz.dot(styledDot);
    await Bun.write(`step_${i}.svg`, svg)
  }
}
