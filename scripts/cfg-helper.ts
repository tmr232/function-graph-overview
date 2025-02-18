import type { Parser } from "web-tree-sitter";
import { type CFG, mergeNodeAttrs } from "../src/control-flow/cfg-defs.ts";
import { type Language, newCFGBuilder } from "../src/control-flow/cfg.ts";
import { simplifyCFG, trimFor } from "../src/control-flow/graph-ops.ts";

export function buildCFG(func: Parser.SyntaxNode, language: Language): CFG {
  const builder = newCFGBuilder(language, { flatSwitch: true });

  let cfg = builder.buildCFG(func);

  cfg = trimFor(cfg);
  cfg = simplifyCFG(cfg, mergeNodeAttrs);
  return cfg;
}
