import Parser from "web-tree-sitter";
import { Builder } from "./builder.ts";
import { BlockMatcher } from "./block-matcher.ts";
import type { BasicBlock, BlockHandler, BuilderOptions } from "./cfg-defs.ts";
import type { NodeMapper } from "./node-mapper.ts";

interface Dispatch {
  single(syntax: Parser.SyntaxNode | null): BasicBlock;
  many(statements: Parser.SyntaxNode[]): BasicBlock;
}
export interface Context {
  builder: Builder;
  options: BuilderOptions;
  matcher: BlockMatcher;
  dispatch: Dispatch;
  state: BlockHandler;
  link: InstanceType<typeof NodeMapper>["add"];
}

type StatementHandler = (syntax: Parser.SyntaxNode, ctx: Context) => BasicBlock;
export type StatementHandlers = {
  named: { [key: string]: StatementHandler };
  default: StatementHandler;
};
