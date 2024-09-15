<script lang="ts">
  import Parser from "web-tree-sitter";
  import { newCFGBuilder, type Language } from "../../../control-flow/cfg";
  import { mergeNodeAttrs } from "../../../control-flow/cfg-defs";
  import { graphToDot, graphToLineNumbers } from "../../../control-flow/render";
  import { simplifyCFG, trimFor } from "../../../control-flow/graph-ops";
  import { Graphviz } from "@hpcc-js/wasm-graphviz";
  import {
    getFirstFunction,
    initialize as initializeUtils,
    type Parsers,
  } from "./utils";
  import { onDestroy, onMount } from "svelte";

  let parsers: Parsers;
  let graphviz: Graphviz;
  let dot: string;
  let lineNumbers: Map<string, number>;
  let mainElement;
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
    options: RenderOptions,
  ) {
    const { trim, simplify, verbose, flatSwitch } = options;
    const tree = parsers[language].parse(code);
    const functionSyntax = getFirstFunction(tree);
    const builder = newCFGBuilder(language, { flatSwitch });

    let cfg = builder.buildCFG(functionSyntax);

    if (!cfg) return "";
    if (trim) cfg = trimFor(cfg);
    if (simplify) cfg = simplifyCFG(cfg, mergeNodeAttrs);

    dot = graphToDot(cfg, verbose);
    lineNumbers = graphToLineNumbers(cfg);
    console.log(lineNumbers);

    return graphviz.dot(dot);
  }

  function renderWrapper(
    code: string,
    language: Language,
    options: RenderOptions,
  ) {
    try {
      return renderCode(code, language, options);
    } catch (error) {
      return `<p style='border: 2px red solid;'>${error.toString()}</p>`;
    }
  }

  export function getSVG() {
    return graphviz.dot(dot);
  }

  function registerClickHandlers(parent: Element) {
    const nodes = parent.querySelectorAll("g.node");
    for (const node of nodes) {
      node.addEventListener("click", () => {
        console.log(node.id, lineNumbers.get(node.id));
      });
    }
  }
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element && node.tagName === "svg") {
          registerClickHandlers(node);
        }
      }
    }
  });
  onMount(() => {
    observer.observe(mainElement, { childList: true, subtree: true });
  });
  onDestroy(() => {
    observer.disconnect();
  });
</script>

<div class="results" bind:this={mainElement}>
  {#await initialize() then}
    <div class="graph">
      {@html renderWrapper(code, language, {
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
