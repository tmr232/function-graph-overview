import { type Container, type Element, SVG, type Svg } from "@svgdotjs/svg.js";
import type Parser from "web-tree-sitter";
import type { GraphNode } from "./cfg-defs.ts";
import {
  type SimpleRange,
  getValue,
  inplaceAddRange,
  newRanges,
} from "./ranges.ts";

type BoundingBox = {
  readonly width: number;
  readonly height: number;
  readonly x: number;
  readonly y: number;
};

function getBoundingBox(group: Container): BoundingBox {
  const boundingBox = {
    width: group.width(),
    height: group.height(),
    x: group.x(),
    y: group.y(),
  };
  if (Object.values(boundingBox).some((n) => typeof n !== "number")) {
    throw new Error(
      `Expected all bounding-box properties to be numbers: ${boundingBox}`,
    );
  }
  return boundingBox as BoundingBox;
}

export function addOverlay(text: string, nodes: string[], svg: Svg) {
  const makeDeepClone = true;
  const assignNewIds = false;
  const temp = svg.clone(makeDeepClone, assignNewIds);

  // We collect all the nodes we want to overlay in a single group.
  // Then we treat the group as a bounding-box for the nodes,
  // and query its position and proportions.
  const nodeGroup = temp.group();
  for (const nodeName of nodes) {
    const nodeElement: Element | null = temp.findOne(
      `#${nodeName}`,
    ) as Element | null;
    if (!nodeElement) {
      throw new Error(`Missing node ${nodeName}`);
    }
    nodeGroup.add(nodeElement);
  }

  const overlayGroup = svg.group();
  const graph: Container | null = svg.findOne("#graph0") as Container | null;
  if (!graph) {
    // This should never happen, as the name is guaranteed by the
    // rendering of the graph using DOT.
    // But if we change something there, it's important to know
    // where we rely on it.
    throw new Error("Missing graph element #graph0 in SVG.");
  }
  overlayGroup.transform(graph.transform());

  const boundingBox = getBoundingBox(nodeGroup);

  const padding = 20;
  overlayGroup
    .rect(boundingBox.width + padding * 2, boundingBox.height + padding * 2)
    .move(boundingBox.x - padding, boundingBox.y - padding)
    .fill("#ff00ff44");
  overlayGroup
    .text(text)
    .fill("#000")
    .move(boundingBox.x, boundingBox.y - padding);
  // @ts-expect-error: Work around but in svg.js
  // The bug is already fixed in https://github.com/svgdotjs/svg.js/commit/1f5f978accc559f54aed0868e1a7a575a14a6d74
  // but that version was not yet released.
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
