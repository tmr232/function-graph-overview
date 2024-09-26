<script lang="ts">
  import Parser from "web-tree-sitter";
  import { newCFGBuilder, type Language } from "../../../control-flow/cfg";
  import {
    mergeNodeAttrs,
    remapNodeTargets,
    type CFG,
  } from "../../../control-flow/cfg-defs";
  import { graphToDot } from "../../../control-flow/render";
  import { simplifyCFG, trimFor } from "../../../control-flow/graph-ops";
  import { Graphviz } from "@hpcc-js/wasm-graphviz";
  import {
    getFirstFunction,
    initialize as initializeUtils,
    type Parsers,
  } from "./utils";
  import { getValue } from "../../../control-flow/ranges";

  let parsers: Parsers;
  let graphviz: Graphviz;
  let dot: string;
  let mainElement;
  let cfg: CFG;
  let tree: Parser.Tree;
  export let offsetToHighlight: number | undefined = undefined;
  export let code: string;
  export let language: Language;
  export let verbose: boolean = false;
  export let simplify: boolean = true;
  export let trim: boolean = true;
  export let flatSwitch: boolean = false;

  async function initialize() {
    const utils = await initializeUtils();
    parsers = utils.parsers;
    graphviz = utils.graphviz;
  }

  interface RenderOptions {
    readonly simplify: boolean;
    readonly verbose: boolean;
    readonly trim: boolean;
    readonly flatSwitch: boolean;
  }

  function renderCode(
    code: string,
    language: Language,
    highlightOffset: number | undefined,
    options: RenderOptions,
  ) {
    const { trim, simplify, verbose, flatSwitch } = options;
    tree = parsers[language].parse(code);
    const functionSyntax = getFirstFunction(tree);
    const builder = newCFGBuilder(language, { flatSwitch });

    cfg = builder.buildCFG(functionSyntax);

    if (!cfg) return "";
    if (trim) cfg = trimFor(cfg);
    if (simplify) cfg = simplifyCFG(cfg, mergeNodeAttrs);
    cfg = remapNodeTargets(cfg);
    const nodeToHighlight = getValue(cfg.offsetToNode, highlightOffset);
    dot = graphToDot(cfg, verbose, nodeToHighlight);

    return graphviz.dot(dot);
  }

  function renderWrapper(
    code: string,
    language: Language,
    highlightOffset: number | undefined,
    options: RenderOptions,
  ) {
    try {
      return renderCode(code, language, highlightOffset, options);
    } catch (error) {
      console.trace(error);
      return `<p style='border: 2px red solid;'>${error.toString()}</p>`;
    }
  }

  export function getSVG() {
    return graphviz.dot(dot);
  }
</script>

<div class="results" bind:this={mainElement}>
  {#await initialize() then}
    <div class="graph">
      {@html renderWrapper(code, language, offsetToHighlight, {
        simplify,
        verbose,
        trim,
        flatSwitch,
      })}
    </div>
  {/await}
</div>

<style>
  .graph {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1em;
  }
</style>
