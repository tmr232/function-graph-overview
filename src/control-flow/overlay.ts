import type { Container, Element, Svg } from "@svgdotjs/svg.js";
import type { Node as SyntaxNode } from "web-tree-sitter";
import type { CFG, GraphNode } from "./cfg-defs.ts";
import type { AttrMerger } from "./graph-ops.ts";
import { Lookup } from "./ranges.ts";
import { svgFromString } from "./svgFromString.ts";

const OVERLAY_START_REGEX = /\bcfg-overlay-start: (.*)/;
const OVERLAY_END_REGEX = /\bcfg-overlay-end\b/;

/**
 * Represents a visual bounding box in SVG.
 * All units should be pixels (px).
 */
type BoundingBox = {
  width: number;
  height: number;
  x: number;
  y: number;
};

/**
 * Returns the bounding-box of the provided bounding-boxes.
 * @param boxes a non-empty array of boxes.
 */
function mergeBoundingBoxes(boxes: BoundingBox[]): BoundingBox {
  return boxes.reduce((prev, current) => {
    const x = Math.min(prev.x, current.x);
    const y = Math.min(prev.y, current.y);
    const width = Math.max(prev.x + prev.width, current.x + current.width) - x;
    const height =
      Math.max(prev.y + prev.height, current.y + current.height) - y;
    return { x, y, width, height };
  });
}

/**
 * Returns the bounding-box of an SVG G element.
 * Assumes units are not specified in the SVG.
 * @param group
 */
function getBoundingBox(group: Container): BoundingBox {
  /*
  All the units we get here are in pixels!
   */
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

/**
 * Render an overlay (note) onto the given SVG
 * @param text note text
 * @param nodes nodes to include
 * @param svg SVG to render onto
 * @returns the bounding box of the newly added overlay.
 */
function addOverlay(text: string, nodes: string[], svg: Svg) {
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
    .fill("#ffed7a")
    .stroke("#000");
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
  return getBoundingBox(overlayGroup);
}

export class OverlayBuilder {
  private readonly overlays: OverlayRange[];
  private readonly overlayLookup: Lookup<OverlayRange | undefined>;

  constructor(functionSyntax: SyntaxNode) {
    this.overlays = parseOverlay(functionSyntax);
    this.overlayLookup = createOverlayRange(this.overlays);
  }

  public getAttrMerger(defaultFn: AttrMerger) {
    return createOverlayAttrMerger(this.overlayLookup, defaultFn);
  }

  public renderOnto(cfg: CFG, rawSvg: string): string {
    const svg = svgFromString(rawSvg);
    const originalHeight = svg.viewbox().height;

    const boundingBoxes: BoundingBox[] = [];
    for (const overlay of this.overlays) {
      const nodesToOverlay = cfg.graph.filterNodes((_node, { startOffset }) => {
        return (
          overlay.startOffset <= startOffset && startOffset < overlay.endOffset
        );
      });
      boundingBoxes.push(addOverlay(overlay.text, nodesToOverlay, svg));
    }

    if (boundingBoxes.length > 0) {
      const merged = mergeBoundingBoxes(boundingBoxes);
      // Quirks of the generation from DOT.
      // This compensates for the weird transform on the graph group.
      merged.y += originalHeight - 4;

      const viewbox = svg.viewbox();
      const adjusted = mergeBoundingBoxes([merged, viewbox]);
      Object.assign(viewbox, adjusted);

      // Allow for a bit more space at the bottom
      viewbox.height += 10;

      // Apply the new viewbox
      svg.viewbox(viewbox);

      /*
      DOT specifies the SVG width and height in pt, but everything else without
      units, resulting in px.
      As a result, we need to add the `pt` when we finish manipulating the
      viewport to keep rendering to the page at the same size. 
      */
      svg.width(`${viewbox.width}pt`);
      svg.height(`${viewbox.height}pt`);
    }
    this.updateBackground(svg);
    return svg.svg();
  }

  private updateBackground(svg: Svg) {
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
      const viewbox = svg.viewbox();
      svg
        .first()
        .before(
          backgroundPolygon
            .x(viewbox.x)
            .y(viewbox.y)
            .width(viewbox.width)
            .height(viewbox.height),
        );
    }
  }
}

/**
 * Creates an `AttrMerger` that doesn't merge across overlay boundary.
 * @param overlayLookup
 * @param defaultFn AttrMerger to wrap
 */
function createOverlayAttrMerger(
  overlayLookup: Lookup<OverlayRange | undefined>,
  defaultFn: (from: GraphNode, into: GraphNode) => GraphNode | null,
) {
  return (from: GraphNode, into: GraphNode): GraphNode | null => {
    if (
      overlayLookup.get(from.startOffset) !==
      overlayLookup.get(into.startOffset)
    ) {
      return null;
    }

    return defaultFn(from, into);
  };
}

function parseOverlayStart(comment: string): string | undefined {
  return OVERLAY_START_REGEX.exec(comment)?.pop();
}

function isOverlayEnd(comment: string): boolean {
  return OVERLAY_END_REGEX.test(comment);
}

type OverlayRange = {
  startOffset: number;
  text: string;
  endOffset: number;
  depth: number;
};

function parseOverlay(func: SyntaxNode): OverlayRange[] {
  const comments = func.descendantsOfType("comment").filter((x) => x !== null);
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

function createOverlayRange(
  overlays: OverlayRange[],
): Lookup<OverlayRange | undefined> {
  const lookup = new Lookup<OverlayRange | undefined>(undefined);
  for (const overlay of overlays.toSorted((a, b) => a.depth - b.depth)) {
    lookup.add(overlay.startOffset, overlay.endOffset, overlay);
  }
  return lookup;
}
