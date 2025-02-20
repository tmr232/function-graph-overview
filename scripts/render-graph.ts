import { parseArgs } from "node:util";
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import { MultiDirectedGraph } from "graphology";
import type {
  CFG,
  GraphEdge,
  GraphNode,
} from "../src/control-flow/cfg-defs.ts";
import { Lookup } from "../src/control-flow/ranges.ts";
import { graphToDot } from "../src/control-flow/render.ts";
import { getColorScheme } from "./render-function.ts";

async function main() {
  const {
    values,
    positionals: [_runtime, _this, gist_url],
  } = parseArgs({
    args: Bun.argv,
    strict: true,
    allowPositionals: true,
    options: {
      colors: {
        type: "string",
      },
      dot: {
        type: "string",
      },
    },
  });

  if (!gist_url) {
    throw new Error("Missing URL");
  }

  const data = await (async () => {
    if (gist_url.startsWith("http")) {
      const response = await fetch(gist_url);
      return response.json();
    }
    return Bun.file(gist_url).json();
  })();

  const graph = new MultiDirectedGraph<GraphNode, GraphEdge>();
  graph.import(data);

  const entry = graph.findNode(
    (node, _attributes) => graph.inDegree(node) === 0,
  );
  if (!entry) {
    throw new Error("No entry found");
  }
  const cfg: CFG = { graph, entry, offsetToNode: new Lookup("Not found") };
  const colorScheme = await getColorScheme(values.colors);

  const graphviz = await Graphviz.load();
  const dot = graphToDot(cfg, false, colorScheme);

  if (values.dot) {
    await Bun.write(values.dot, dot);
  }

  const svg = graphviz.dot(dot);
  console.log(svg);
}

if (require.main === module) {
  await main();
}
