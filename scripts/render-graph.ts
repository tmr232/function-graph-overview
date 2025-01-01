import { parseArgs } from "node:util";
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import { MultiDirectedGraph } from "graphology";
import type {
  CFG,
  GraphEdge,
  GraphNode,
} from "../src/control-flow/cfg-defs.ts";
import { graphToDot } from "../src/control-flow/render.ts";

async function main() {
  const {
    positionals: [_runtime, _this, gist_url],
  } = parseArgs({
    args: Bun.argv,
    strict: true,
    allowPositionals: true,
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
  const cfg: CFG = { graph, entry, offsetToNode: [] };
  const dot = graphToDot(cfg);
  const graphviz = await Graphviz.load();
  const svg = graphviz.dot(dot);
  console.log(svg);
  // console.log(dot);
}

if (require.main === module) {
  await main();
}
