<script lang="ts">
  import Parser from "web-tree-sitter";
  import { CFGBuilder, mergeNodeAttrs } from "../../../control-flow/cfg";
  import { graphToDot } from "../../../control-flow/render";
  import { simplifyCFG, trimFor } from "../../../control-flow/graph-ops";
  import { Graphviz } from "@hpcc-js/wasm-graphviz";
  import { getFirstFunction, initializeParser } from "./utils";

  let parser: Parser;
  let graphviz: Graphviz;
  let svg: string = "";
  let ast: string = "";
  let dot: string = "";
  export let code: string;
  export let verbose: boolean = false;
  export let simplify: boolean = true;
  export let trim: boolean = true;
  export let flatSwitch: boolean = false;
  export let showDot: boolean = false;
  export let showAST: boolean = false;

  async function initialize() {
    parser = await initializeParser();
    graphviz = await Graphviz.load();
    return { parser, graphviz };
  }

  interface RenderOptions {
    readonly simplify: boolean;
    readonly verbose: boolean;
    readonly trim: boolean;
    readonly flatSwitch: boolean;
  }

  function renderCode(code: string, options: RenderOptions) {
    const { trim, simplify, verbose } = options;
    const tree = parser.parse(code);

    const functionNode = getFirstFunction(tree);

    ast = functionNode
      .toString()
      .replaceAll(
        "(",
        "<div style='margin-left:10px;border-left: 1px #888 solid;'>",
      )
      .replaceAll(")", "</div>");
    console.log(functionNode.childForFieldName("name").text);
    let builder = new CFGBuilder({ flatSwitch });
    let cfg = builder.buildCFG(functionNode);
    if (!cfg) {
      return;
    }

    if (trim) {
      cfg = trimFor(cfg);
    }

    if (simplify) {
      cfg = simplifyCFG(cfg, mergeNodeAttrs);
    }
    dot = graphToDot(cfg, verbose);
    return graphviz.dot(dot);
  }

  function renderWrapper(code: string, options: RenderOptions) {
    try {
      return renderCode(code, options);
    } catch (error) {
      return `<p style='border: 2px red solid;'>${error.toString()}</p>`;
    }
  }
</script>

<div class="results">
  {#await initialize() then}
    <div class="graph">
      {@html renderWrapper(code, { simplify, verbose, trim, flatSwitch })}
    </div>
  {/await}
  {#if showAST}
    <br />
    <details>
      <summary>AST</summary>
      {@html ast}
    </details>
  {/if}
  {#if showDot}
    <br />
    <details>
      <summary>DOT</summary>
      <pre>{dot}</pre>
    </details>
  {/if}
</div>

<style>
  .graph {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1em;
  }
</style>
