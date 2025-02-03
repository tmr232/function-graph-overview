<script lang="ts">
  import Parser, { type SyntaxNode } from "web-tree-sitter";
  import { functionNodeTypes, type Language } from "../control-flow/cfg";
  import { Graphviz } from "@hpcc-js/wasm-graphviz";
  import { initialize as initializeUtils, type Parsers } from "./utils";
  import { createEventDispatcher, onMount } from "svelte";
  import { type ColorList, getLightColorList } from "../control-flow/colors";
  import { Renderer, type RenderOptions } from "./renderer.ts";
  import { memoizeFunction } from "./caching.ts";
  import objectHash from "object-hash";
  import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";

  /*
  TODO:
    - [ ] Highlight as an SVG edit, not a re-render
    - [ ] Remember position when returning to the same function (if the code didn't change)
    - [ ] Change the pointer
   */

  type CodeAndOffset = { code: string; offset: number; language: Language };

  let resultHash: string = "";
  let parsers: Parsers;
  let graphviz: Graphviz;
  let dot: string;
  let getNodeOffset: (nodeId: string) => number | undefined = () => undefined;
  let getOffsetNode: (offset: number) => string;
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

  const getRenderer = memoizeFunction({
    func: (options: RenderOptions, colorList: ColorList, graphviz: Graphviz) =>
      new Renderer(options, colorList, graphviz),
    hash: (options: RenderOptions, colorList: ColorList, _graphviz: Graphviz) =>
      objectHash({ options, colorList }),
    max: 1,
  });

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

    const renderer = getRenderer(options, colorList, graphviz);
    const renderResult = renderer.render(
      functionSyntax,
      language,
      cursorOffset,
    );
    dot = renderResult.dot;
    getNodeOffset = renderResult.getNodeOffset;
    getOffsetNode = renderResult.getOffsetNode;
    // TODO: Only reset when we move between functions
    const newHash = objectHash(functionSyntax.startPosition);
    if (newHash !== resultHash) {
      panzoom.reset({ animate: false });
      resultHash = newHash;
    } else {
      panToNode(getOffsetNode(cursorOffset));
    }

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
    console.log(target.id);
    panToNode(target.id);
  }

  let zoomable: Element;
  let parent: Element;
  let panzoom: PanzoomObject;
  function initPanzoom() {
    panzoom = Panzoom(zoomable, { maxScale: 100, minScale: 1 });
    zoomable.parentElement.addEventListener("wheel", panzoom.zoomWithWheel);
  }

  function panToNode(nodeId: string) {
    const node = zoomable.querySelector(`#${nodeId}`);
    // Find the midpoint for the screen and the node to center on
    const findMidpoint = (el: Element) => {
      const boundingClientRect = el.getBoundingClientRect();
      return {
        x: boundingClientRect.x + boundingClientRect.width / 2,
        y: boundingClientRect.y + boundingClientRect.height / 2,
      };
    };
    const parentMidpoint = findMidpoint(parent);
    const nodeMidpoint = findMidpoint(node);

    // Find the diff between them - that is our relative pan
    const panDiff = {
      x: parentMidpoint.x - nodeMidpoint.x,
      y: parentMidpoint.y - nodeMidpoint.y,
    };
    // Relative movement is scaled by the scale, so we need to undo that scaling.
    const scale = panzoom.getScale();
    panzoom.pan(panDiff.x / scale, panDiff.y / scale, {
      animate: true,
      relative: true,
    });
    console.log(parentMidpoint, nodeMidpoint, panDiff, scale);
  }

  onMount(() => {
    initPanzoom();
  });
</script>

<div id="parent" bind:this={parent}>
  <div id="zoomable" bind:this={zoomable}>
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
  </div>
</div>

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
