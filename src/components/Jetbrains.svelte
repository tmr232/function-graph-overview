<script lang="ts">
  import Parser, { type SyntaxNode } from "web-tree-sitter";
  import {
    newCFGBuilder,
    type Language,
    functionNodeTypes,
  } from "../control-flow/cfg";
  import {
    mergeNodeAttrs,
    remapNodeTargets,
    type CFG,
  } from "../control-flow/cfg-defs";
  import { graphToDot } from "../control-flow/render";
  import { simplifyCFG, trimFor } from "../control-flow/graph-ops";
  import { Graphviz } from "@hpcc-js/wasm-graphviz";
  import { initialize as initializeUtils, type Parsers } from "./utils";
  import { createEventDispatcher } from "svelte";
  import {
    listToScheme,
    getLightColorList,
    type ColorList,
  } from "../control-flow/colors";

  type CodeAndOffset = { code: string; offset: number; language: Language };

  let parsers: Parsers;
  let graphviz: Graphviz;
  let dot: string;
  let cfg: CFG;
  let tree: Parser.Tree;
  let svg: string;
  export let colorList = getLightColorList();
  export let codeAndOffset: CodeAndOffset | null = null;
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

  function getFunctionAtOffset(
    tree: Parser.Tree,
    offset: number,
    language: Language,
  ): Parser.SyntaxNode | null {
    let syntax: SyntaxNode | null = tree.rootNode.descendantForIndex(offset);

    while (syntax) {
      if (functionNodeTypes[language].includes(syntax.type)) {
        break;
      }
      syntax = syntax.parent;
    }
    return syntax;
  }

  function renderCode(
    code: string,
    language: Language,
    cursorOffset: number,
    options: RenderOptions,
    colorList: ColorList,
  ) {
    const { trim, simplify, verbose, flatSwitch, highlight } = options;
    tree = parsers[language].parse(code);
    const functionSyntax = getFunctionAtOffset(tree, cursorOffset, language);
    if (!functionSyntax) {
      throw new Error("No function found!");
    }

    const builder = newCFGBuilder(language, { flatSwitch });

    cfg = builder.buildCFG(functionSyntax);

    if (!cfg) return "";
    if (trim) cfg = trimFor(cfg);
    if (simplify) cfg = simplifyCFG(cfg, mergeNodeAttrs);
    cfg = remapNodeTargets(cfg);
    const nodeToHighlight = highlight
      ? cfg.offsetToNode.get(cursorOffset)
      : undefined;
    dot = graphToDot(cfg, verbose, nodeToHighlight, listToScheme(colorList));

    return graphviz.dot(dot);
  }

  function renderWrapper(
    codeAndOffset: CodeAndOffset | null,
    options: RenderOptions,
    colorList: ColorList,
  ) {
    try {
      if (codeAndOffset === null) {
        svg = graphviz.dot(`digraph G { 
    bgcolor="#2B2D30"
    node [color="#e0e0e0", fontcolor="#e0e0e0"]
    edge [color="#e0e0e0"]
    Hello -> World 
}`);
      } else {
        svg = renderCode(
          codeAndOffset.code,
          codeAndOffset.language,
          codeAndOffset.offset,
          options,
          colorList,
        );
      }
    } catch (error) {
      console.trace(error);
    }
    return svg;
  }

  function onClick(event: MouseEvent) {
    console.log("onClick triggered!");
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

  export function applyColors(colors: ColorList) {
    colorList = colors;
  }
</script>

{#await initialize() then}
  <!-- I don't know how to make this part accessible. PRs welcome! -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="graph" on:click={onClick}>
    {@html renderWrapper(
      codeAndOffset,
      {
        simplify,
        verbose,
        trim,
        flatSwitch,
        highlight,
      },
      colorList,
    )}
  </div>
{/await}

<style>
  .graph {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1em;
    width: 100%;
    height: 100%;
  }
</style>
