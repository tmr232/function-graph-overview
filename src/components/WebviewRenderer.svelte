<script lang="ts">
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import type { PanzoomObject } from "@panzoom/panzoom";
import objectHash from "object-hash";
import { createEventDispatcher } from "svelte";
import type { Action } from "svelte/action";
import { type Node as SyntaxNode, type Tree } from "web-tree-sitter";
import { type Language, languageDefinitions } from "../control-flow/cfg";
import { type ColorList, getLightColorList } from "../control-flow/colors";
import PanzoomComp from "./PanzoomComp.svelte";
import { memoizeFunction } from "./caching.ts";
import { type RenderOptions, Renderer } from "./renderer.ts";
import { type Parsers, initialize as initializeUtils } from "./utils";

type CodeAndOffset = { code: string; offset: number; language: Language };

let parsers: Parsers;
let graphviz: Graphviz;
let getNodeOffset: (nodeId: string) => number | undefined = () => undefined;
let offsetToNode: (offset: number) => string | undefined = () => undefined;
let svg: string;
interface Props {
  colorList?: ColorList;
  codeAndOffset?: CodeAndOffset | null;
  verbose?: boolean;
  simplify?: boolean;
  trim?: boolean;
  flatSwitch?: boolean;
  highlight?: boolean;
  showRegions?: boolean;
}

let {
  colorList = getLightColorList(),
  codeAndOffset = null,
  verbose = false,
  simplify = true,
  trim = true,
  flatSwitch = true,
  highlight = true,
  showRegions = false,
}: Props = $props();

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
  tree: Tree,
  offset: number,
  language: Language,
): SyntaxNode | null {
  let syntax: SyntaxNode | null = tree.rootNode.descendantForIndex(offset);

  while (syntax) {
    if (languageDefinitions[language].functionNodeTypes.includes(syntax.type)) {
      break;
    }
    syntax = syntax.parent;
  }
  return syntax;
}

/// Hash identifier of the current function, used to keep track of function changes.
let functionId: string | undefined = undefined;
/// True if a function changed in the last change of rendering input
let functionChanged: boolean = true;

function trackFunctionChanges(functionSyntax: SyntaxNode, language: string) {
  // Keep track of when the function changes so that we can update the
  // panzoom accordingly.
  const newFunctionId = objectHash({ code: functionSyntax.text, language });
  functionChanged = functionId !== newFunctionId;
  functionId = newFunctionId;
  if (functionChanged) {
    pzComp.reset();
  }
}

function renderCode(
  code: string,
  language: Language,
  cursorOffset: number,
  options: RenderOptions,
  colorList: ColorList,
) {
  const tree = parsers[language].parse(code);
  if (!tree) {
    throw new Error("Failed to parse code.");
  }
  const functionSyntax = getFunctionAtOffset(tree, cursorOffset, language);
  if (!functionSyntax) {
    throw new Error("No function found!");
  }
  trackFunctionChanges(functionSyntax, language);

  const renderer = getRenderer(options, colorList, graphviz);
  const renderResult = renderer.render(functionSyntax, language, cursorOffset);
  getNodeOffset = renderResult.getNodeOffset;
  offsetToNode = renderResult.offsetToNode;
  return renderResult.svg;
}

function renderWrapper(
  codeAndOffset: CodeAndOffset | null,
  options: RenderOptions,
  colorList: ColorList,
) {
  console.log("Rendering!");
  const bgcolor = colorList.find(({ name }) => name === "graph.background").hex;
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

async function asyncRenderWrapper(
  codeAndOffset: CodeAndOffset | null,
  options: RenderOptions,
  colorList: ColorList,
) {
  return Promise.resolve(renderWrapper(codeAndOffset, options, colorList));
}

function onZoomClick(
  event: MouseEvent | TouchEvent | PointerEvent,
  panzoom: PanzoomObject,
  zoomElement: HTMLElement,
): void {
  console.log("Zoom click!");
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

let pzComp: PanzoomComp;
let enableZoom: boolean = $state(false);
const panAfterRender: Action = () => {
  if (functionChanged) {
    return;
  }
  if (codeAndOffset === null) {
    return;
  }
  const selectedNode = offsetToNode(codeAndOffset.offset);
  if (selectedNode) {
    pzComp.panTo(`#${selectedNode}`);
  }
};
</script>
<div class="editor-controls">
  <input type="checkbox" id="panzoom" bind:checked={enableZoom}/> <label for="panzoom">Pan & Zoom</label>
</div>
<PanzoomComp bind:this={pzComp} onclick={onZoomClick} disabled={!enableZoom}>
{#await initialize() then _}
  <!-- I don't know how to make this part accessible. PRs welcome! -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="graph">
    {#await asyncRenderWrapper(
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
    ) then inlineSvg}
      <div class="svg-wrapper" use:panAfterRender>
        {@html inlineSvg}
      </div>
    {/await}
  </div>
{/await}
</PanzoomComp>


<style>
  .graph {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1em;
    width: 100%;
    height: 100%;
  }

  .svg-wrapper {
      width: 100%;
      height: 100%;
  }

  :root {
      /* We don't yet get the actual colors from the JetBrains IDEs,
         so we fake them and default to just dark for now.
       */
      --jetbrains-editor-background: #2B2D30;
      --jetbrains-editor-foreground: #dddddd;
      --jetbrains-color-scheme: dark;
  }

  .editor-controls {
      z-index: 1000;
      position: relative;
      width: 100%;
      background-color: var(--vscode-editor-background, var(--jetbrains-editor-background));
      color: var(--vscode-editor-foreground, var(--jetbrains-editor-foreground));
      color-scheme: var(--jetbrains-color-scheme);
      padding: 0.5em;
  }

  /* Match the VSCode light/dark toggle for the checkboxes */
  :global(.vscode-light) .editor-controls {
      color-scheme: light;
  }

  :global(.vscode-dark) .editor-controls {
      color-scheme: dark;
  }

</style>
