import type { Graphviz } from "@hpcc-js/wasm-graphviz";
import { type G, type Polygon, SVG, type Svg } from "@svgdotjs/svg.js";
import objectHash from "object-hash";
import type Parser from "web-tree-sitter";
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
    hash: (functionSyntax: Parser.SyntaxNode, language: Language) =>
      objectHash({ code: functionSyntax.text, language }),
    max: 100,
  });
  constructor(
    private readonly options: RenderOptions,
    private readonly colorList: ColorList,
    private readonly graphviz: Graphviz,
  ) {}

  public render(
    functionSyntax: Parser.SyntaxNode,
    language: Language,
    offsetToHighlight?: number,
  ): {
    svg: string;
    dot: string;
    getNodeOffset: (nodeId: string) => number | undefined;
  } {
    let { dot, svg, getNodeOffset, offsetToNode } = this.memoizedRenderStatic(
      functionSyntax,
      language,
    );

    const nodeToHighlight =
      offsetToHighlight && this.options.highlight
        ? offsetToNode(offsetToHighlight)
        : undefined;

    // Highlight Node
    if (nodeToHighlight) {
      const dom = svgFromString(svg);
      const node: G | null = dom.findOne(`g#${nodeToHighlight}`) as G | null;
      if (node) {
        // The highlight class is used when previewing colors in the demo.
        node.addClass("highlight");
      }
      const poly: Polygon | null = dom.findOne(
        `g#${nodeToHighlight} polygon`,
      ) as Polygon | null;
      if (poly) {
        poly.fill(listToScheme(this.colorList)["node.highlight"]);
      }
      svg = dom.svg();
    }

    return {
      svg: svg,
      dot,
      getNodeOffset,
    };
  }

  private renderStatic(functionSyntax: Parser.SyntaxNode, language: Language) {
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

    // Overlay regions
    if (this.options.showRegions) {
      svg = overlayBuilder.renderOnto(cfg, svg);
    }

    return {
      svg,
      dot,
      getNodeOffset: (nodeId: string) =>
        cfg.graph.getNodeAttribute(nodeId, "startOffset"),
      offsetToNode: (offset: number) => cfg.offsetToNode.get(offset),
    };
  }
}
function svgFromString(rawSvg: string): Svg {
  const parser = new DOMParser();
  const dom = parser.parseFromString(rawSvg, "image/svg+xml");
  return SVG(dom.documentElement) as Svg;
}
