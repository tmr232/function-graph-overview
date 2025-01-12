import { type Container, type Element, SVG, type Svg } from "@svgdotjs/svg.js";
import type Parser from "web-tree-sitter";
import type { CFG, GraphNode } from "./cfg-defs.ts";
import type { AttrMerger } from "./graph-ops.ts";
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

  // This next part puts the overlay _under_ the graph.
  graph.before(overlayGroup);
}

export class OverlayBuilder {
  private readonly overlays: OverlayRange[];
  private readonly overlayRanges: SimpleRange<OverlayRange | undefined>[];

  constructor(functionSyntax: Parser.SyntaxNode) {
    this.overlays = parseOverlay(functionSyntax);
    this.overlayRanges = createOverlayRange(this.overlays);
  }

  public getAttrMerger(defaultFn: AttrMerger) {
    return createOverlayAttrMerger(this.overlayRanges, defaultFn);
  }

  public renderOnto(cfg: CFG, rawSvg: string): string {
    const svg = svgFromString(rawSvg);
    this.moveBackgroundBack(svg);

    for (const overlay of this.overlays) {
      const nodesToOverlay = cfg.graph.filterNodes((_node, { startOffset }) => {
        return (
          overlay.startOffset <= startOffset && startOffset < overlay.endOffset
        );
      });
      addOverlay(overlay.text, nodesToOverlay, svg);
    }

    return svg.svg();
  }

  private moveBackgroundBack(svg: Svg) {
    // First, we move the background polygon out of the graph group and to the back
    const graph = svg.findOne("#graph0") as Container | null;
    if (!graph) {
      // This should never happen, as the name is guaranteed by the
      // rendering of the graph using DOT.
      // But if we change something there, it's important to know
      // where we rely on it.
      throw new Error("Missing graph element #graph0 in SVG.");
    }
    const backgroundPolygon = graph.children()[0];
    if (backgroundPolygon?.type === "polygon") {
      graph.before(backgroundPolygon.x(0).y(0));
    }
  }
}

/**
 * Create an SVG object from a string representing an SVG
 * @param rawSvg the SVG string
 */
export function svgFromString(rawSvg: string): Svg {
  const parser = new DOMParser();
  const dom = parser.parseFromString(rawSvg, "image/svg+xml");
  return SVG(dom.documentElement) as Svg;
}

/**
 * Creates an `AttrMerger` that doesn't merge across overlay boundary.
 * @param overlayRanges
 * @param defaultFn AttrMerger to wrap
 */
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
