import type { Node as SyntaxNode } from "web-tree-sitter";
import { callProcessorFor } from "../src/control-flow/call-processor.ts";
import { type CFG, mergeNodeAttrs } from "../src/control-flow/cfg-defs.ts";
import { type Language, newCFGBuilder } from "../src/control-flow/cfg.ts";
import { simplifyCFG, trimFor } from "../src/control-flow/graph-ops.ts";

export function buildCFG(func: SyntaxNode, language: Language): CFG {
  const builder = newCFGBuilder(language, {
    flatSwitch: true,
    callProcessor: callProcessorFor(language),
  });

  let cfg = builder.buildCFG(func);

  cfg = trimFor(cfg);
  cfg = simplifyCFG(cfg, mergeNodeAttrs);
  return cfg;
}
