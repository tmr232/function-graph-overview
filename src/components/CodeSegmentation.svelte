<script lang="ts">
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import { Node as SyntaxNode } from "web-tree-sitter";
import { type Language, newCFGBuilder } from "../control-flow/cfg";
import {
  type CFG,
  mergeNodeAttrs,
  remapNodeTargets,
} from "../control-flow/cfg-defs";
import { simplifyCFG, trimFor } from "../control-flow/graph-ops";
import {
  type Parsers,
  getFirstFunction,
  initialize as initializeUtils,
} from "./utils";

let parsers: Parsers;
let graphviz: Graphviz;
let nodeColors: NodeColors;
interface Props {
  simplify?: boolean;
  trim?: boolean;
  code: string;
  language: Language;
}

let { simplify = true, trim = true, code, language }: Props = $props();

async function initialize() {
  const utils = await initializeUtils();
  parsers = utils.parsers;
  graphviz = utils.graphviz;
}

function withBackground(text: string, color: string): string {
  return `<span style="background: ${color};">${text}</span>`;
}

type NodeColors = Map<string, string>;

function createNodeColors(cfg: CFG): Map<string, string> {
  const nodes = new Set(cfg.offsetToNode.values());
  const nodeColors = new Map(
    [...nodes.keys()].map((node, i, { length }) => [
      node,
      `hsl(${(360 * i) / length}deg 60% 60%)`,
    ]),
  );
  return nodeColors;
}

function renderRanges(
  cfg: CFG,
  functionSyntax: SyntaxNode,
  sourceText: string,
  nodeColors: NodeColors,
): string {
  let result = "";
  const funcStart = functionSyntax.startIndex;
  const funcEnd = functionSyntax.endIndex;
  for (const { start, stop, value: node } of cfg.offsetToNode) {
    if ((stop ?? 0) < funcStart || start > funcEnd) {
      continue;
    }
    result += withBackground(
      sourceText.slice(
        Math.max(start, funcStart),
        Math.min(funcEnd, stop ?? sourceText.length),
      ),
      nodeColors.get(node) ?? "red",
    );
  }

  let legend = [...nodeColors.entries()]
    .map(([name, color]) => withBackground(name, color))
    .join("\n");
  return `${result}\n\n\n${legend}`;
}

type Options = { simplify: boolean; trim: boolean };
function visualizeCodeSegmentation(
  code: string,
  language: Language,
  options: Options,
) {
  const { trim, simplify } = options;
  const tree = parsers[language].parse(code);
  const functionSyntax = getFirstFunction(tree, language);
  const builder = newCFGBuilder(language, {});

  let cfg = builder.buildCFG(functionSyntax);

  if (!cfg) return "";
  if (trim) cfg = trimFor(cfg);
  if (simplify) cfg = simplifyCFG(cfg, mergeNodeAttrs);
  cfg = remapNodeTargets(cfg);
  nodeColors = createNodeColors(cfg);
  return renderRanges(cfg, functionSyntax, code, nodeColors);
  // return renderPointRanges(cfg, functionSyntax, code, nodeColors);
}

function renderWrapper(code: string, language: Language, options: Options) {
  try {
    return visualizeCodeSegmentation(code, language, options);
  } catch (error) {
    console.trace(error);
    return `<p style='border: 2px red solid;'>${error.toString()}</p>`;
  }
}

function recolorNodes() {
  const nodes = document.querySelectorAll("svg .node");
  for (const node of nodes) {
    const color = nodeColors.get(node.id) ?? "white";
    for (const polygon of node.querySelectorAll("polygon")) {
      polygon.setAttribute("fill", color);
    }
  }
}
</script>

{#await initialize() then _}
  <pre>{@html renderWrapper(code, language, { simplify, trim })}</pre>
  <button onclick={recolorNodes}>Recolor Nodes</button>
{/await}

<style>
</style>
