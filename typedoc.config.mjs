import { GraphvizDotPlugin } from "./src/markdown-it-graphviz/plugin.js";

const graphvizDotPlugin = await GraphvizDotPlugin();

/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
  out: "dist/docs",
  projectDocuments: ["docs/*"],
  categoryOrder: ["Guides", "Testing", "*"],
  hostedBaseUrl: "https://tmr232.github.io/function-graph-overview/docs",
  entryPoints: ["src/control-flow/*"],
  readme: "CONTRIBUTING.md",
  name: "Function Graph Overview",
  sort: ["source-order"],
  exclude: ["src/test/commentTestSamples", "src/demo/src/assets"],
  markdownItLoader(parser) {
    parser.use(graphvizDotPlugin);
  },
};

export default config;
