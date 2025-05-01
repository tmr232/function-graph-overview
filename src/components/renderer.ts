import type { Graphviz } from "@hpcc-js/wasm-graphviz";
import type { G, Polygon } from "@svgdotjs/svg.js";
import objectHash from "object-hash";
import type { Node as SyntaxNode } from "web-tree-sitter";
import { type Language, newCFGBuilder } from "../control-flow/cfg";
import { mergeNodeAttrs, remapNodeTargets } from "../control-flow/cfg-defs";
import { type ColorList, listToScheme } from "../control-flow/colors";
import {
  type AttrMerger,
  simplifyCFG,
  trimFor,
} from "../control-flow/graph-ops";
import { OverlayBuilder } from "../control-flow/overlay.ts";
import { graphToDot } from "../control-flow/render";
import { svgFromString } from "../control-flow/svgFromString.ts";
import { memoizeFunction } from "./caching.ts";

export interface RenderOptions {
  readonly simplify: boolean;
  readonly verbose: boolean;
  readonly trim: boolean;
  readonly flatSwitch: boolean;
  readonly highlight: boolean;
  readonly showRegions: boolean;
}

export class Renderer {
  private memoizedRenderStatic = memoizeFunction({
    func: this.renderStatic.bind(this),
    hash: (functionSyntax: SyntaxNode, language: Language) =>
      objectHash({ code: functionSyntax.text, language }),
    max: 100,
  });
  constructor(
    private readonly options: RenderOptions,
    private readonly colorList: ColorList,
    private readonly graphviz: Graphviz,
  ) {}

  public render(
    functionSyntax: SyntaxNode,
    language: Language,
    offsetToHighlight?: number,
  ): {
    svg: string;
    dot: string;
    getNodeOffset: (nodeId: string) => number | undefined;
    offsetToNode: (offset: number) => string;
  } {
    let { dot, svg, getNodeOffset, offsetToNode } = this.memoizedRenderStatic(
      functionSyntax,
      language,
    );

    // We want to allow the function to move without changing (in case of code
    // edits in other functions).
    // To do that, we need to make all offset calculations relative to the
    // function and not the file.
    const baseOffset = functionSyntax.startIndex;

    const nodeToHighlight =
      offsetToHighlight && this.options.highlight
        ? offsetToNode(offsetToHighlight - baseOffset)
        : undefined;

    if (nodeToHighlight) {
      svg = this.highlightNode(svg, nodeToHighlight);
    }

    return {
      svg: svg,
      dot,
      getNodeOffset: (nodeId: string) => getNodeOffset(nodeId) + baseOffset,
      offsetToNode: (offset: number) => offsetToNode(offset - baseOffset),
    };
  }

  private highlightNode(svg: string, nodeId: string): string {
    try {
      const dom = svgFromString(svg);
      // We construct the SVG, so we know the node must exist.
      const node: G = dom.findOne(`g#${nodeId}`) as G;
      // Same applies to the polygon.
      const poly: Polygon = node.findOne("polygon") as Polygon;
      // The highlight class is used when previewing colors in the demo.
      node.addClass("highlight");
      poly.fill(listToScheme(this.colorList)["node.highlight"]);
      return dom.svg();
    } catch (e) {
      console.error(`Failed to highlight node ${nodeId}:`, e);
      return svg;
    }
  }

  private renderStatic(functionSyntax: SyntaxNode, language: Language) {
    const overlayBuilder = new OverlayBuilder(functionSyntax);

    const builder = newCFGBuilder(language, {
      flatSwitch: this.options.flatSwitch,
    });

    // Build the CFG
    let cfg = builder.buildCFG(functionSyntax);
    if (!cfg) throw new Error("Failed generating CFG for function");
    if (this.options.trim) cfg = trimFor(cfg);
    const nodeAttributeMerger: AttrMerger = this.options.showRegions
      ? overlayBuilder.getAttrMerger(mergeNodeAttrs)
      : mergeNodeAttrs;
    if (this.options.simplify) {
      cfg = simplifyCFG(cfg, nodeAttributeMerger);
    }
    cfg = remapNodeTargets(cfg);

    // Render to DOT
    const dot = graphToDot(
      cfg,
      this.options.verbose,
      listToScheme(this.colorList),
    );

    // Render SVG
    let svg = this.graphviz.dot(dot);

    // Set width and height
    const dom = svgFromString(svg);
    dom.width("100%");
    dom.height("100%");
    svg = dom.svg();

    // Overlay regions
    if (this.options.showRegions) {
      svg = overlayBuilder.renderOnto(cfg, svg);
    }

    return {
      svg,
      dot,
      // We must work with function-relative offsets, as we want to allow the function
      // to move without changing.
      getNodeOffset: (nodeId: string) =>
        cfg.graph.getNodeAttribute(nodeId, "startOffset") -
        functionSyntax.startIndex,
      offsetToNode: (offset: number) =>
        cfg.offsetToNode.get(offset + functionSyntax.startIndex),
    };
  }
}
