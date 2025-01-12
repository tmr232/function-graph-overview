import { type Dom, SVG } from "@svgdotjs/svg.js";
import type Parser from "web-tree-sitter";
import type { GraphNode } from "./cfg-defs.ts";
import {
  type SimpleRange,
  getValue,
  inplaceAddRange,
  newRanges,
} from "./ranges.ts";

export function addOverlay(text: string, nodes: string[], svg: Dom) {
  const makeDeepClone = true;
  const assignNewIds = false;
  const temp = svg.clone(makeDeepClone, assignNewIds);
  const graph = temp.findOne("#graph0");
  const group = temp.group();
  group.transform(graph.transform());
  for (const nodeName of nodes) {
    group.add(graph.findOne(`#${nodeName}`));
  }

  const overlayGroup = svg.group();
  overlayGroup.transform(svg.findOne("#graph0").transform());
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

export function svgFromString(rawSvg: string) {
  const parser = new DOMParser();
  const dom = parser.parseFromString(rawSvg, "image/svg+xml");
  return SVG(dom.documentElement);
}

export function createOverlayAttrMerger(
  overlayRanges: SimpleRange<OverlayRange | undefined>[],
  defaultFn: (from: GraphNode, into: GraphNode) => GraphNode | null,
) {
  return (from: GraphNode, into: GraphNode): GraphNode | null => {
    console.log(
      "merge?",
      from,
      into,
      getValue(overlayRanges, from.startOffset),
      getValue(overlayRanges, into.startOffset),
    );
    if (
      getValue(overlayRanges, from.startOffset) !==
      getValue(overlayRanges, into.startOffset)
    ) {
      return null;
    }

    return defaultFn(from, into);
  };
}

const overlayStartRegex = /\bcfg-overlay-start: (.*)/;
const overlayEndRegex = /\bcfg-overlay-end\b/;

function parseOverlayStart(comment: string): string | undefined {
  return overlayStartRegex.exec(comment)?.pop();
}

function isOverlayEnd(comment: string): boolean {
  return overlayEndRegex.test(comment);
}
type OverlayRange = {
  startOffset: number;
  text: string;
  endOffset: number;
  depth: number;
};

export function parseOverlay(func: Parser.SyntaxNode): OverlayRange[] {
  const comments = func.descendantsOfType("comment");
  const stack: { startOffset: number; text: string }[] = [];
  const overlays: OverlayRange[] = [];
  for (const comment of comments) {
    console.log("comment text", comment.text);
    const text = parseOverlayStart(comment.text);
    if (text) {
      stack.push({ startOffset: comment.startIndex, text });
    } else if (isOverlayEnd(comment.text)) {
      const overlayStart = stack.pop();
      if (!overlayStart) {
        throw new Error("Overlay start-end mismatch");
      }
      const overlay = {
        startOffset: overlayStart.startOffset,
        text: overlayStart.text,
        endOffset: comment.startIndex,
        depth: stack.length,
      };
      overlays.push(overlay);
    }
  }
  return overlays;
}

export function createOverlayRange(
  overlays: OverlayRange[],
): SimpleRange<OverlayRange | undefined>[] {
  const ranges = newRanges<OverlayRange | undefined>(undefined);
  for (const overlay of overlays.toSorted((a, b) => a.depth - b.depth)) {
    inplaceAddRange(ranges, overlay.startOffset, overlay.endOffset, overlay);
  }
  return ranges;
}
