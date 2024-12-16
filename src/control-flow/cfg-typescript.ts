import type Parser from "web-tree-sitter";
import { cStyleIfProcessor } from "./c-style.ts";
import type { BasicBlock, BuilderOptions, CFGBuilder } from "./cfg-defs";
import {
  type Context,
  GenericCFGBuilder,
  type StatementHandlers,
} from "./generic-cfg-builder.ts";

export function createCFGBuilder(options: BuilderOptions): CFGBuilder {
  return new GenericCFGBuilder(statementHandlers, options);
}

/*
I want to improve the dev experience as I am writing this, so here's the game-plan:

- As we draw the graph, any non-handled (or default-handled) node will have
  its entire AST content pretty-printed inside it, in the web demo.
- This means that the playground is less necessary, as I can see the interesting
  and handle them directly.
- There should be helper functions for this, so that it is easy to for new
  languages
- This should be documented and added to the guide on writing a new language
 */

const ifStatementQuery = `
      (if_statement
        condition: (_ ")" @closing-paren) @cond
        consequence: (_) @then
        alternative: (
            else_clause ([
                (if_statement) @else-if
                (statement_block) @else-body
                ])
        )? @else
      )@if
  `;

const statementHandlers: StatementHandlers = {
  named: {
    if_statement: cStyleIfProcessor(ifStatementQuery),
  },
  default: defaultProcessStatement,
};

function defaultProcessStatement(
  syntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const newNode = ctx.builder.addNode(
    "STATEMENT",
    syntax.text,
    syntax.startIndex,
  );

  ctx.link.syntaxToNode(syntax, newNode);
  return { entry: newNode, exit: newNode };
}
