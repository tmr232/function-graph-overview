import Parser from "web-tree-sitter";
import { Builder } from "./builder.ts";
import { BlockMatcher } from "./block-matcher.ts";
import type { BasicBlock, BuilderOptions } from "./cfg-defs.ts";

type StatementHandler = (
  syntax: Parser.SyntaxNode,
  builder: Builder,
  match: (
    syntax: Parser.SyntaxNode,
    mainName: string,
    query: string
  ) => BlockMatcher,
  options: BuilderOptions
) => BasicBlock;
export type StatementHandlers = {
  block: string;
  named: { [key: string]: StatementHandler };
  default: StatementHandler;
};