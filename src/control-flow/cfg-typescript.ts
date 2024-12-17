import type Parser from "web-tree-sitter";
import type { BasicBlock, BuilderOptions, CFGBuilder } from "./cfg-defs";
import {
  cStyleDoWhileProcessor,
  cStyleForStatementProcessor,
  cStyleIfProcessor,
  cStyleWhileProcessor,
  forEachLoopProcessor,
  processBreakStatement, processComment,
  processReturnStatement,
  processStatementSequence
} from "./common-patterns.ts";
import {
  type Context,
  GenericCFGBuilder,
  type StatementHandlers,
} from "./generic-cfg-builder.ts";
import { buildSwitch, collectCases } from "./switch-utils.ts";

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

const cStyleForStatementQuery = `
(for_statement
    "(" @open-parens
    [
        initializer: (_ ";" @init-semi)? @init
        ";" @init-semi
    ]
    
    condition: [
        (empty_statement (";") @cond-semi)
        (
            (_) @cond
            (#not-eq? @cond ";")
            ";" @cond-semi
        )
    ]
    
    increment: (_)? @update
    ")" @close-parens
    body: (_) @body
) @for
`;

const statementHandlers: StatementHandlers = {
  named: {
    statement_block: processStatementSequence,
    if_statement: cStyleIfProcessor(ifStatementQuery),
    for_in_statement: processForStatement,
    for_statement: cStyleForStatementProcessor(cStyleForStatementQuery),
    while_statement: cStyleWhileProcessor(),
    do_statement: cStyleDoWhileProcessor(),
    switch_statement: processSwitchlike,
    break_statement: processBreakStatement,
    return_statement: processReturnStatement,
    comment: processComment,
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

const caseTypes = new Set(["switch_case", "switch_default"]);

function getCases(switchSyntax: Parser.SyntaxNode): Parser.SyntaxNode[] {
  const switchBody = switchSyntax.namedChildren[1] as Parser.SyntaxNode;
  return switchBody.namedChildren.filter((child) => caseTypes.has(child.type));
}

function parseCase(caseSyntax: Parser.SyntaxNode): {
  isDefault: boolean;
  consequence: Parser.SyntaxNode[];
  hasFallthrough: boolean;
} {
  const isDefault = caseSyntax.type === "switch_default";
  const consequence = caseSyntax.namedChildren.slice(isDefault ? 0 : 1);
  const hasFallthrough = true;
  return { isDefault, consequence, hasFallthrough };
}

function processSwitchlike(
  switchSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const blockHandler = ctx.matcher.state;

  const cases = collectCases(switchSyntax, ctx, { getCases, parseCase });
  const headNode = ctx.builder.addNode(
    "SWITCH_CONDITION",
    getChildFieldText(switchSyntax, "value"),
    switchSyntax.startIndex,
  );
  ctx.link.syntaxToNode(switchSyntax, headNode);
  const mergeNode: string = ctx.builder.addNode(
    "SWITCH_MERGE",
    "",
    switchSyntax.endIndex,
  );
  buildSwitch(cases, mergeNode, headNode, {}, ctx);

  blockHandler.forEachBreak((breakNode) => {
    ctx.builder.addEdge(breakNode, mergeNode);
  });

  const braceMatch = ctx.matcher.match(
    switchSyntax,
    `
    (switch_statement 
	      body: (switch_body "{" @opening-brace "}" @closing-brace)
    ) @switch
    `,
  );
  const openingBrace = braceMatch.requireSyntax("opening-brace");
  const closingBrace = braceMatch.requireSyntax("closing-brace");
  const caseSyntaxMany = getCases(switchSyntax);
  const firstCase = caseSyntaxMany[0];
  if (firstCase) {
    ctx.link.offsetToSyntax(openingBrace, firstCase);
  }
  const lastCase = caseSyntaxMany[caseSyntaxMany.length - 1];
  if (lastCase) {
    ctx.link.offsetToSyntax(lastCase, closingBrace, {
      reverse: true,
      includeTo: true,
    });
  }

  return blockHandler.update({ entry: headNode, exit: mergeNode });
}

function getChildFieldText(node: Parser.SyntaxNode, fieldName: string): string {
  const child = node.childForFieldName(fieldName);
  return child ? child.text : "";
}
