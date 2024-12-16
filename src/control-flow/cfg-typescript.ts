import type Parser from "web-tree-sitter";
import type { BasicBlock, BuilderOptions, CFGBuilder } from "./cfg-defs";
import { cStyleIfProcessor, forEachLoopProcessor } from "./common-patterns.ts";
import {
  type Context,
  GenericCFGBuilder,
  type StatementHandlers,
} from "./generic-cfg-builder.ts";

export function createCFGBuilder(options: BuilderOptions): CFGBuilder {
  return new GenericCFGBuilder(statementHandlers, options);
}

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

const processForStatement = forEachLoopProcessor({
  query: `
    (for_in_statement
      (")") @closingParen
      body: (_) @body
    ) @for
      `,
  body: "body",
  headerEnd: "closingParen",
});

const statementHandlers: StatementHandlers = {
  named: {
    if_statement: cStyleIfProcessor(ifStatementQuery),
    for_in_statement: processForStatement,
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
