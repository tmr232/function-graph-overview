<script lang="ts">
  import Parser from "web-tree-sitter";
  import { newCFGBuilder, type Language } from "../control-flow/cfg";
  import {
    mergeNodeAttrs,
    remapNodeTargets,
    type CFG,
  } from "../control-flow/cfg-defs";
  import { graphToDot } from "../control-flow/render";
  import { simplifyCFG, trimFor } from "../control-flow/graph-ops";
  import { Graphviz } from "@hpcc-js/wasm-graphviz";
  import {
    getFirstFunction,
    initialize as initializeUtils,
    type Parsers,
  } from "./utils";
  import { getValue } from "../control-flow/ranges";
  import { createEventDispatcher } from "svelte";

  let parsers: Parsers;
  let graphviz: Graphviz;
  let dot: string;
  let cfg: CFG;
  let tree: Parser.Tree;
  export let offsetToHighlight: number | undefined = undefined;
  export let code: string;
  export let language: Language;
  export let verbose: boolean = false;
  export let simplify: boolean = true;
  export let trim: boolean = true;
  export let flatSwitch: boolean = false;
  export let highlight: boolean = true;

  const dispatch = createEventDispatcher();

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
    readonly highlight: boolean;
  }

  function renderCode(
    code: string,
    language: Language,
    highlightOffset: number | undefined,
    options: RenderOptions,
  ) {
    const { trim, simplify, verbose, flatSwitch, highlight } = options;
    tree = parsers[language].parse(code);
    const functionSyntax = getFirstFunction(tree);
    const builder = newCFGBuilder(language, { flatSwitch });

    cfg = builder.buildCFG(functionSyntax);

    if (!cfg) return "";
    if (trim) cfg = trimFor(cfg);
    if (simplify) cfg = simplifyCFG(cfg, mergeNodeAttrs);
    cfg = remapNodeTargets(cfg);
    const nodeToHighlight = highlight
      ? getValue(cfg.offsetToNode, highlightOffset)
      : undefined;
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
  export function getDOT() {
    // @ts-expect-error: "canon" not supported in type signature
    return graphviz.dot(dot, "canon");
  }

  function onClick(event) {
    let target: Element = event.target;
    while (
      target.tagName !== "div" &&
      target.tagName !== "svg" &&
      !target.classList.contains("node")
    ) {
      target = target.parentElement;
    }
    if (!target.classList.contains("node")) {
      return;
    }
    dispatch("node-clicked", {
      node: target.id,
      offset: cfg.graph.getNodeAttribute(target.id, "startOffset"),
    });
  }
</script>

<div class="results">
  {#await initialize() then}
    <div class="graph" on:click={onClick}>
      {@html renderWrapper(code, language, offsetToHighlight, {
        simplify,
        verbose,
        trim,
        flatSwitch,
        highlight,
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
