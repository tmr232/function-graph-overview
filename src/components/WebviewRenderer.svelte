<script lang="ts">
  import Parser, { type SyntaxNode } from "web-tree-sitter";
  import { functionNodeTypes, type Language } from "../control-flow/cfg";
  import { Graphviz } from "@hpcc-js/wasm-graphviz";
  import { initialize as initializeUtils, type Parsers } from "./utils";
  import { createEventDispatcher } from "svelte";
  import { type ColorList, getLightColorList } from "../control-flow/colors";
  import { Renderer, type RenderOptions } from "./renderer.ts";

  type CodeAndOffset = { code: string; offset: number; language: Language };

  let parsers: Parsers;
  let graphviz: Graphviz;
  let dot: string;
  let getNodeOffset: (nodeId: string) => number | undefined = () => undefined;
  let tree: Parser.Tree;
  let svg: string;
  export let colorList = getLightColorList();
  export let codeAndOffset: CodeAndOffset | null = null;
  export let verbose: boolean = false;
  export let simplify: boolean = true;
  export let trim: boolean = true;
  export let flatSwitch: boolean = false;
  export let highlight: boolean = true;
  export let showRegions: boolean = false;

  const dispatch = createEventDispatcher();

  async function initialize() {
    const utils = await initializeUtils();
    parsers = utils.parsers;
    graphviz = utils.graphviz;
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
    tree = parsers[language].parse(code);
    const functionSyntax = getFunctionAtOffset(tree, cursorOffset, language);
    if (!functionSyntax) {
      throw new Error("No function found!");
    }

    const renderer = new Renderer(options, colorList, graphviz);
    const renderResult = renderer.render(
      functionSyntax,
      language,
      cursorOffset,
    );
    dot = renderResult.dot;
    getNodeOffset = renderResult.getNodeOffset;

    return renderResult.svg;
  }

  function renderWrapper(
    codeAndOffset: CodeAndOffset | null,
    options: RenderOptions,
    colorList: ColorList,
  ) {
    console.log("Rendering!", codeAndOffset, colorList);
    const bgcolor = colorList.find(
      ({ name }) => name === "graph.background",
    ).hex;
    const color = colorList.find(({ name }) => name === "node.highlight").hex;
    try {
      if (codeAndOffset === null) {
        svg = graphviz.dot(/*DOT*/ `digraph G {
    bgcolor="${bgcolor}"
    node [color="${color}", fontcolor="${color}"]
    edge [color="${color}"]
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
      offset: getNodeOffset(target.id),
    });
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
        showRegions,
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
