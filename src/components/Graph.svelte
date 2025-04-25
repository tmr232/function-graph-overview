<script lang="ts">
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import objectHash from "object-hash";
import { createEventDispatcher } from "svelte";
import { Tree } from "web-tree-sitter";
import { type Language } from "../control-flow/cfg";
import {
  type ColorList,
  getLightColorList,
  listToScheme,
} from "../control-flow/colors";
import { memoizeFunction } from "./caching.ts";
import { type RenderOptions, Renderer } from "./renderer.ts";
import {
  type Parsers,
  getFirstFunction,
  initialize as initializeUtils,
} from "./utils";

let parsers: Parsers;
let graphviz: Graphviz;
let dot: string;
let tree: Tree;
let savedSvg: string;
let getNodeOffset: (nodeId: string) => number | undefined = () => undefined;
interface Props {
  colorList?: ColorList;
  offsetToHighlight?: number | undefined;
  code: string;
  language: Language;
  verbose?: boolean;
  simplify?: boolean;
  trim?: boolean;
  flatSwitch?: boolean;
  highlight?: boolean;
  showRegions?: boolean;
}

let {
  colorList = $bindable(getLightColorList()),
  offsetToHighlight = undefined,
  code,
  language,
  verbose = false,
  simplify = true,
  trim = true,
  flatSwitch = true,
  highlight = true,
  showRegions = false,
}: Props = $props();

const dispatch = createEventDispatcher();

const getRenderer = memoizeFunction({
  func: (options: RenderOptions, colorList: ColorList, graphviz: Graphviz) =>
    new Renderer(options, colorList, graphviz),
  hash: (options: RenderOptions, colorList: ColorList, _graphviz: Graphviz) =>
    objectHash({ options, colorList }),
  max: 1,
});

async function initialize() {
  const utils = await initializeUtils();
  parsers = utils.parsers;
  graphviz = utils.graphviz;
}

function renderCode(
  code: string,
  language: Language,
  highlightOffset: number | undefined,
  options: RenderOptions,
  colorList: ColorList,
) {
  tree = parsers[language].parse(code);
  const functionSyntax = getFirstFunction(tree, language);
  if (!functionSyntax) {
    throw new Error("No function found!");
  }

  const renderer = getRenderer(options, colorList, graphviz);
  const renderResult = renderer.render(
    functionSyntax,
    language,
    highlightOffset,
  );
  savedSvg = renderResult.svg;
  dot = renderResult.dot;
  getNodeOffset = renderResult.getNodeOffset;
  return savedSvg;
}

function renderWrapper(
  code: string,
  language: Language,
  highlightOffset: number | undefined,
  options: RenderOptions,
  colorList: ColorList,
) {
  try {
    return renderCode(code, language, highlightOffset, options, colorList);
  } catch (error) {
    console.trace(error);
    return `<p style='border: 2px red solid;'>${error}</p>`;
  }
}

export function getSVG() {
  return savedSvg;
}
export function getDOT() {
  return dot;
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

function recolorNodes(cls: string, fill: string, stroke?: string): void {
  const polygonsToRecolor = document.querySelectorAll(
    `svg g.node.${cls} polygon`,
  );

  const recolor = (el: Element) => {
    el.setAttribute("fill", fill);
    if (stroke !== undefined) el.setAttribute("stroke", stroke);
  };

  polygonsToRecolor.forEach(recolor);
}

function recolorClusters(cls: string, fill: string, stroke?: string): void {
  const polygonsToRecolor = document.querySelectorAll(
    `svg g.cluster.${cls} polygon`,
  );

  const recolor = (el: Element) => {
    el.setAttribute("fill", fill);
    if (stroke !== undefined) el.setAttribute("stroke", stroke);
  };

  polygonsToRecolor.forEach(recolor);
}

function recolorEdges(cls: string, color: string): void {
  const polygonsToRecolor = document.querySelectorAll(
    `svg g.edge.${cls} polygon`,
  );
  const pathsToRecolor = document.querySelectorAll(`svg g.edge.${cls} path`);

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
  svg.parentElement.style.backgroundColor = color;
  const backgroundRect = svg.querySelector("g.graph > polygon");
  if (backgroundRect) {
    backgroundRect.setAttribute("fill", color);
  }
}

export function previewColors(colors: ColorList) {
  const colorScheme = listToScheme(colors);
  for (const { name, hex } of colors) {
    const [type, cls] = name.split(".", 2);
    switch (type) {
      case "node":
        recolorNodes(cls, hex, colorScheme["node.border"]);
        break;
      case "edge":
        recolorEdges(cls, hex);
        break;
      case "cluster":
        recolorClusters(cls, hex, colorScheme["cluster.border"]);
        break;
      case "graph":
        recolorBackground(hex);
        break;
      default:
        console.log(name);
    }
  }
}

export function resetPreview() {
  previewColors(colorList);
}

export function applyColors(colors: ColorList) {
  colorList = colors;
}
</script>

<div class="results">
  {#await initialize() then}
    <!-- I don't know how to make this part accessible. PRs welcome! -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="graph" onclick={onClick}>
      {@html renderWrapper(
        code,
        language,
        offsetToHighlight,
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

<style>
  .graph {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1em;
      width: 100%;
      height: 100%;
  }
  .results {
      width: 100%;
      height: 100%;
  }
  .graph :global(svg) {
      width: 100%;
      height: 100%;
  }
</style>
