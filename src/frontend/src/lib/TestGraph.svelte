<script lang="ts">
  import { newCFGBuilder } from "../../../control-flow/cfg";
  import { mergeNodeAttrs } from "../../../control-flow/cfg-defs";
  import { graphToDot } from "../../../control-flow/render";
  import { simplifyCFG, trimFor } from "../../../control-flow/graph-ops";
  import { Graphviz } from "@hpcc-js/wasm-graphviz";
  import { getFirstFunction, initializeParsers, type Parsers } from "./utils";
  import { type TestFuncRecord } from "../../../test/commentTestUtils";

  let parsers: Parsers;
  let graphviz: Graphviz;
  let ast: string = "";
  let dot: string = "";
  export let record: TestFuncRecord;
  export let verbose: boolean = false;
  export let simplify: boolean = true;
  export let trim: boolean = true;
  export let flatSwitch: boolean = false;
  export let showDot: boolean = false;
  export let showAST: boolean = false;

  async function initialize() {
    parsers = await initializeParsers();
    graphviz = await Graphviz.load();
    return {};
  }

  interface RenderOptions {
    readonly simplify: boolean;
    readonly verbose: boolean;
    readonly trim: boolean;
    readonly flatSwitch: boolean;
  }

  function formatAST(ast: string): string {
    return ast
      .replaceAll(
        "(",
        "<div style='margin-left:10px;border-left: 1px #888 solid;'>",
      )
      .replaceAll(")", "</div>");
  }

  function renderRecord(
    record: TestFuncRecord,
    options: RenderOptions,
  ): string {
    const { trim, simplify, verbose, flatSwitch } = options;
    const tree = parsers[record.language].parse(record.code);
    const functionSyntax = getFirstFunction(tree);
    const builder = newCFGBuilder(record.language, { flatSwitch });

    let cfg = builder.buildCFG(functionSyntax);

    if (!cfg) return "";
    if (trim) cfg = trimFor(cfg);
    if (simplify) cfg = simplifyCFG(cfg, mergeNodeAttrs);

    dot = graphToDot(cfg, verbose);
    ast = formatAST(functionSyntax.toString());

    return graphviz.dot(dot);
  }

  function renderWrapper(record: TestFuncRecord, options: RenderOptions) {
    try {
      return renderRecord(record, options);
    } catch (error) {
      return `<p style='border: 2px red solid;'>${error.toString()}</p>`;
    }
  }
</script>

<div class="results">
  {#await initialize() then}
    <div class="graph">
      {@html renderWrapper(record, { simplify, verbose, trim, flatSwitch })}
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
