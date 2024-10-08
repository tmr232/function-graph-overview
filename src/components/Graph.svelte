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
    if (!functionSyntax) {
      throw new Error("No function found!");
    }

    const builder = newCFGBuilder(language, { flatSwitch });

    cfg = builder.buildCFG(functionSyntax);

    if (!cfg) return "";
    if (trim) cfg = trimFor(cfg);
    if (simplify) cfg = simplifyCFG(cfg, mergeNodeAttrs);
    cfg = remapNodeTargets(cfg);
    const nodeToHighlight =
      highlightOffset && highlight
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
      return `<p style='border: 2px red solid;'>${error}</p>`;
    }
  }

  export function getSVG() {
    return graphviz.dot(dot);
  }
  export function getDOT() {
    return graphviz.dot(dot, "canon");
  }

  function onClick(event: MouseEvent) {
    let target: Element = event.target as Element;
    while (
      target.tagName !== "div" &&
      target.tagName !== "svg" &&
      !target.classList.contains("node") &&
      target.parentElement !== null
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

  function recolorNodes(type: string, fill: string, stroke?: string): void {
    const polygonsToRecolor = document.querySelectorAll(
      `svg g.node.${type} polygon`,
    );

    const recolor = (el: Element) => {
      el.setAttribute("fill", fill);
      if (stroke !== undefined) el.setAttribute("stroke", stroke);
    };

    polygonsToRecolor.forEach(recolor);
  }

  function recolorClusters(type: string, fill: string, stroke?: string): void {
    const polygonsToRecolor = document.querySelectorAll(
      `svg g.cluster.${type} polygon`,
    );

    const recolor = (el: Element) => {
      el.setAttribute("fill", fill);
      if (stroke !== undefined) el.setAttribute("stroke", stroke);
    };

    polygonsToRecolor.forEach(recolor);
  }

  function recolorEdges(type: string, color: string): void {
    const polygonsToRecolor = document.querySelectorAll(
      `svg g.edge.${type} polygon`,
    );
    const pathsToRecolor = document.querySelectorAll(`svg g.edge.${type} path`);

    const recolor = (el: Element) => {
      for (const attr of ["fill", "stroke"]) {
        if (el.getAttribute(attr) !== "none") {
          el.setAttribute(attr, color);
        }
      }
    };

    polygonsToRecolor.forEach(recolor);
    pathsToRecolor.forEach(recolor);
  }

  function recolorBackground(color: string): void {
    const svg = document.querySelector("svg");
    if (!svg) return;

    svg.style.backgroundColor = color;
  }

  let hue = 0;
  let saturation = 50;
  let light = 50;

  // $: recolorNodes("default", `hsl(${hue} ${saturation} ${light})`);
  // $: recolorEdges("regular", `hsl(${hue} ${saturation} ${light})`);
  // $: recolorClusters("tryComplex", `hsl(${hue} ${saturation} ${light})`);
  $: recolorBackground(`hsl(${hue} ${saturation} ${light})`);
</script>

<div class="results">
  {#await initialize() then}
    <!-- I don't know how to make this part accessible. PRs welcome! -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
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
  <button on:click={() => recolorNodes("default", "pink")}>Recolor!</button>
  <input type="range" min="0" max="360" bind:value={hue} />
</div>

<style>
  .graph {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1em;
  }
</style>
