<script lang="ts">
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import objectHash from "object-hash";
import { createEventDispatcher } from "svelte";
import { type Node as SyntaxNode, type Tree } from "web-tree-sitter";
import { type Language, functionNodeTypes } from "../control-flow/cfg";
import { type ColorList, getLightColorList } from "../control-flow/colors";
import { memoizeFunction } from "./caching.ts";
import { type RenderOptions, Renderer } from "./renderer.ts";
import { type Parsers, initialize as initializeUtils } from "./utils";

type CodeAndOffset = { code: string; offset: number; language: Language };

let parsers: Parsers;
let graphviz: Graphviz;
let dot: string;
let getNodeOffset: (nodeId: string) => number | undefined = () => undefined;
let tree: Tree;
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
  const renderResult = renderer.render(functionSyntax, language, cursorOffset);
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
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="graph" onclick={onClick}>
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
