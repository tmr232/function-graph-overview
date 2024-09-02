<script lang="ts">
  import Parser from "web-tree-sitter";
  import { CFGBuilder, mergeNodeAttrs } from "control-flow/cfg";
  import { graphToDot } from "control-flow/render";
  import { simplifyGraph, trimFor } from "control-flow/graph-ops";
  import { Graphviz } from "@hpcc-js/wasm-graphviz";

  async function initializeParser() {
    await Parser.init();
    const parser = new Parser();
    const Go = await Parser.Language.load("tree-sitter-go.wasm");
    parser.setLanguage(Go);
    return parser;
  }

  let parser: Parser;
  let graphviz: Graphviz;
  let svg: string = "";
  let ast: string = "";
  export let code: string;
  export let verbose: boolean = false;
  export let simplify: boolean = true;
  export let trim: boolean = true;

  async function initialize() {
    parser = await initializeParser();
    graphviz = await Graphviz.load();
    return { parser, graphviz };
  }

  function getFirstFunction(tree: Parser.Tree): Parser.SyntaxNode | null {
    let functionNode: Parser.SyntaxNode = null;
    const cursor = tree.walk();

    const funcTypes = [
      "function_declaration",
      "method_declaration",
      "func_literal",
    ];

    const visitNode = () => {
      if (funcTypes.includes(cursor.nodeType)) {
        functionNode = cursor.currentNode;
        return;
      }

      if (cursor.gotoFirstChild()) {
        do {
          visitNode();
        } while (cursor.gotoNextSibling());
        cursor.gotoParent();
      }
    };

    visitNode();
    return functionNode;
  }

  interface RenderOptions {
    readonly simplify: boolean;
    readonly verbose: boolean;
    readonly trim: boolean;
  }

  function renderCode(code: string, options: RenderOptions) {
    const { trim, simplify, verbose } = options;
    const tree = parser.parse(code);

    const functionNode = getFirstFunction(tree);

    ast = functionNode.toString();

    let builder = new CFGBuilder();
    let { graph: cfg, entry: entry } = builder.buildCFG(functionNode);
    if (!cfg) {
      return;
    }

    if (trim) {
      cfg = trimFor(cfg, entry);
    }

    if (simplify) {
      cfg = simplifyGraph(cfg, mergeNodeAttrs);
    }
    const dot = graphToDot(cfg, verbose);
    return graphviz.dot(dot);
  }
</script>

<div class="graph">
  {#await initialize() then}
    {@html renderCode(code, { simplify, verbose, trim })}
  {/await}
  <!-- <br />
  {ast} -->
</div>
