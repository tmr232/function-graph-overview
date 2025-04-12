import { Graphviz } from "@hpcc-js/wasm-graphviz";
import {
  type EdgeModel,
  type NodeModel,
  type RootGraphModel,
  type SubgraphModel,
  attribute,
  fromDot,
  toDot,
} from "ts-graphviz";
import {
  type ColorScheme,
  getDefaultColorScheme,
} from "../control-flow/colors.ts";
import {
  getEdgeDefaultStyle,
  getEdgeStyle,
  getNodeHeight,
  getNodeStyle,
  isEdgeClass,
  isNodeClass,
} from "./theme.ts";

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
  const nodeAttrs = getNodeStyle("default", colorScheme);
  nodeAttrs.fontname = "sans-serif";
  nodeAttrs.height = getNodeHeight("default", 0);
  G.node(nodeAttrs);
  G.edge(getEdgeDefaultStyle(colorScheme));

  for (const node of iterAllNodes(G)) {
    for (const cls of getClasses(node)) {
      if (isNodeClass(cls)) {
        node.attributes.apply(getNodeStyle(cls, colorScheme));
        node.attributes.set("height", getNodeHeight(cls, 0));
      }
    }
  }

  for (const edge of iterAllEdges(G)) {
    const isBacklink = edge.attributes.get(attribute.dir) === "back";
    for (const cls of getClasses(edge)) {
      if (isEdgeClass(cls)) {
        edge.attributes.apply(getEdgeStyle(cls, isBacklink, colorScheme));
      }
    }
    if (isBacklink) {
      edge.targets.reverse();
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

// function editDotLink(dot: string): string {
//   return `https://dreampuf.github.io/GraphvizOnline/?compressed=${LZString.compressToEncodedURIComponent(dot)}`;
// }

// const graphExamples = {
//   Condition: `
//   a -> b [class="consequence"]
//   a -> c [class="alternative"]
//   b [label="True"]
//   c [label="False"]
//   `,
//   Switch: `
//   a -> b
//   a -> c
//   a -> d
//   a -> e
//   a -> f
//
//   a -> x [class="alternative"]
//
//   b -> x
//   c -> x
//   d -> x
//   e -> x
//   f -> x
//   `,
//   Entry: `
//   a [class="entry"]
//   a -> b
//   b [style="invis"]
//   `,
//   Loop: `
//   head -> body [class="consequence"]
//   body -> head [dir=back]
//   head -> exit [class="alternative"]
//   `,
// };

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
  `,
];

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
  for (let i = 0; i < gradual.length; ++i) {
    const step = gradual[i];
    const styledDot = applyTheme(
      `digraph { ${step} }`,
      getDefaultColorScheme(),
    );
    const svg = graphviz.dot(styledDot);
    await Bun.write(`step_${i}.svg`, svg);
  }
}
