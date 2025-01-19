import type { Graphviz } from "@hpcc-js/wasm-graphviz";
import type Parser from "web-tree-sitter";
import { type Language, newCFGBuilder } from "../control-flow/cfg";
import { type BuilderOptions, type CFG, mergeNodeAttrs, remapNodeTargets } from "../control-flow/cfg-defs";
import { type ColorList, listToScheme } from "../control-flow/colors";
import {
  type AttrMerger,
  simplifyCFG,
  trimFor,
} from "../control-flow/graph-ops";
import { OverlayBuilder } from "../control-flow/overlay.ts";
import { graphToDot } from "../control-flow/render";



export interface RenderOptions {
  readonly simplify: boolean;
  readonly verbose: boolean;
  readonly trim: boolean;
  readonly flatSwitch: boolean;
  readonly highlight: boolean;
  readonly showRegions: boolean;
}

function buildCFG(functionSyntax:Parser.SyntaxNode, language:Language, options:BuilderOptions):CFG {
  const builder = newCFGBuilder(language, options);

  // Build the CFG
  return builder.buildCFG(functionSyntax);
}


export class Renderer {
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
    getOffsetNode: (offset: number) => string;
  } {
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
    const nodeToHighlight =
      offsetToHighlight && this.options.highlight
        ? cfg.offsetToNode.get(offsetToHighlight)
        : undefined;

    // Render to DOT
    const dot = graphToDot(
      cfg,
      this.options.verbose,
      nodeToHighlight,
      listToScheme(this.colorList),
    );

    // Render SVG
    const rawSvg = this.graphviz.dot(dot);
    let svg: string;
    if (this.options.showRegions) {
      svg = overlayBuilder.renderOnto(cfg, rawSvg);
    } else {
      svg = rawSvg;
    }

    return {
      svg: svg,
      dot,
      getNodeOffset: (nodeId: string): number =>
        cfg.graph.getNodeAttribute(nodeId, "startOffset"),
      getOffsetNode: (offset: number): string => cfg.offsetToNode.get(offset),
    };
  }
}
