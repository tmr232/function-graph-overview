import { SVG } from "@svgdotjs/svg.js";
import { type CFG, type OverlayTag, getNodeRemapper, type GraphNode, mergeNodeAttrs } from "./cfg-defs.ts";
import type { Language } from "./cfg.ts";
import Parser from "web-tree-sitter";

type Overlay = {
  nodes: string[];
  text: string;
};

function collectOverlays(cfg: CFG): Overlay[] {
  const overlayMap: Map<OverlayTag, string[]> = new Map();
  cfg.graph.forEachNode((node, { overlayTag }) => {
    if (!overlayTag) {
      return;
    }

    for (let tag: OverlayTag | undefined = overlayTag; tag; tag = tag.parent) {
      if (!overlayMap.has(tag)) {
        overlayMap.set(tag, [node]);
      } else {
        overlayMap.get(tag)?.push(node);
      }
    }
  });

  const overlays: Overlay[] = [];

  // We sort the tags by depth so that we can draw the larger ones below
  // the smaller ones.
  for (const [tag, nodes] of Array.from(overlayMap.entries()).toSorted(
    (a, b) => b[0].depth - a[0].depth,
  )) {
    overlays.push({ text: tag.text, nodes: nodes });
  }

  return overlays;
}

export type OverlayConfig = {
  svgQuery: string;
  graphQuery: string;
};
const defaultOverlayConfig: OverlayConfig = {
  svgQuery: "svg",
  graphQuery: "#graph0",
};
function overlayNodes(
  text: string,
  nodeNames: string[],
  overlayConfig?: OverlayConfig,
): void {
  // Apply the provided config on top of the defaults.
  const config = Object.assign(
    structuredClone(defaultOverlayConfig),
    overlayConfig,
  );
  const svg = SVG(document.querySelector(config.svgQuery));
  const makeDeepClone = true;
  const assignNewIds = false;
  const temp = svg.clone(makeDeepClone, assignNewIds);
  const graph = temp.findOne(config.graphQuery);
  const group = temp.group();
  group.transform(graph.transform());
  for (const nodeName of nodeNames) {
    group.add(graph.findOne(`#${nodeName}`));
  }

  const overlayGroup = svg.group();
  overlayGroup.transform(svg.findOne(config.graphQuery).transform());
  const padding = 20;
  overlayGroup
    .rect(group.width() + padding * 2, group.height() + padding * 2)
    .move(group.x() - padding, group.y() - padding)
    .fill("#ff00ff44");
  overlayGroup
    .text(text)
    .fill("#000")
    .move(group.x(), group.y() - padding);
  overlayGroup.css({ "pointer-events": "none" });
}

export function renderOverlay(cfg: CFG) {
  const overlays = collectOverlays(cfg);
  const remapper = getNodeRemapper(cfg);
  for (const { text, nodes } of overlays) {
    overlayNodes(text, nodes.map(remapper));
  }
}

function svgFromString(rawSvg: string) {
  const parser = new DOMParser();
  const dom = parser.parseFromString(rawSvg, "image/svg+xml");
  return SVG(dom.documentElement);
}

function overlayAttrMerger(from:GraphNode, into:GraphNode): GraphNode| null {
  if (getOverlayFor(from.startOffset) !== getOverlayFor(into.startOffset)) {
    return null;
  }

  return mergeNodeAttrs(from, into);
}

export function parseOverlay(func:Parser.SyntaxNode, language:Language) {
  const comments = func.descendantsOfType("comment");
  const overlayStack = [];
  for (const comment of comments) {
    if (isOverlayStart(comment)) {
      // Create overlay
    } else if (isOverlayEnd(comment)) {
      // End overlay
    }
  }
}