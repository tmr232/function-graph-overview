<script lang="ts">
  import Parser from "web-tree-sitter";
  import { newCFGBuilder, type Language } from "../../../control-flow/cfg";
  import { mergeNodeAttrs, type CFG } from "../../../control-flow/cfg-defs";
  import { graphToDot, graphToLineNumbers } from "../../../control-flow/render";
  import { simplifyCFG, trimFor } from "../../../control-flow/graph-ops";
  import { Graphviz } from "@hpcc-js/wasm-graphviz";
  import {
    getFirstFunction,
    initialize as initializeUtils,
    type Parsers,
  } from "./utils";
  import { createEventDispatcher, onMount } from "svelte";

  let parsers: Parsers;
  let graphviz: Graphviz;
  let dot: string;
  let lineNumbers: Map<string, number>;
  let mainElement;
  let cfg: CFG;
  let tree: Parser.Tree;
  let highlightTemplate: Element;
  export let code: string;
  export let language: Language;
  export let verbose: boolean = false;
  export let simplify: boolean = true;
  export let trim: boolean = true;
  export let flatSwitch: boolean = false;
  const dispatch = createEventDispatcher();

  function goto(lineNumber: number) {
    dispatch("goto", { lineNumber });
  }

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
    tree = parsers[language].parse(code);
    const functionSyntax = getFirstFunction(tree);
    const builder = newCFGBuilder(language, { flatSwitch });

    cfg = builder.buildCFG(functionSyntax);

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

  let highlightedNode: Element;
  export function setCursor(row: number, column: number) {
    if (!cfg.syntaxToNode) return;
    let syntax = tree.rootNode.descendantForPosition({ row, column });
    for (; syntax && !cfg.syntaxToNode.has(syntax.id); syntax = syntax.parent);
    if (!syntax) return;
    const svgNode = document.querySelector(
      `#${cfg.syntaxToNode.get(syntax.id)}`,
    );
    svgNode.classList.add(...highlightTemplate.classList);
    if (highlightedNode && highlightedNode !== svgNode) {
      highlightedNode.classList.remove(...highlightTemplate.classList);
    }
    highlightedNode = svgNode;
  }

  function findParentGraphNode(
    element: Element,
    container: Element,
  ): Element | null {
    for (; element && element !== container; element = element.parentElement) {
      if (element.classList.contains("node")) {
        return element;
      }
    }
    return null;
  }

  function registerClickHandler(container: Element) {
    container.addEventListener("click", (e) => {
      const nodeElement = findParentGraphNode(e.target, container);
      if (!nodeElement) {
        return;
      }
      const lineNumber = lineNumbers.get(nodeElement.id);
      console.log(nodeElement.id, lineNumber);
      if (lineNumber !== undefined) {
        goto(lineNumber);
      }
    });
  }

  onMount(() => {
    registerClickHandler(mainElement);
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
<div class="highlight" style="display:none" bind:this={highlightTemplate}></div>

<style>
  .graph {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1em;
  }
  .highlight {
    filter: drop-shadow(0 0 5px red);
  }
</style>
