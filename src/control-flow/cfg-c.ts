import type Parser from "web-tree-sitter";
import type { BasicBlock, BuilderOptions, CFGBuilder } from "./cfg-defs";
import {
  cStyleDoWhileProcessor,
  cStyleForStatementProcessor,
  cStyleIfProcessor,
  cStyleWhileProcessor,
} from "./common-patterns.ts";
import {
  type Context,
  GenericCFGBuilder,
  type StatementHandlers,
} from "./generic-cfg-builder.ts";
import { buildSwitch, collectCases } from "./switch-utils.ts";

function getChildFieldText(node: Parser.SyntaxNode, fieldName: string): string {
  const child = node.childForFieldName(fieldName);
  return child ? child.text : "";
}

const processIfStatement = cStyleIfProcessor(`
      (if_statement
        condition: (_ ")" @closing-paren) @cond
        consequence: (_) @then
        alternative: (
            else_clause ([
                (if_statement) @else-if
                (compound_statement) @else-body
                ])
        )? @else
      )@if
  `);
const processForStatement = cStyleForStatementProcessor(`
    (for_statement
        "(" @open-parens
        [
        	initializer: (_ ";" @init-semi)? @init
        	";" @init-semi
        ]
        condition: (_)? @cond
        ";" @cond-semi
        update: (_)? @update
        ")" @close-parens
        body: (_) @body) @for
    `);

const statementHandlers: StatementHandlers = {
  named: {
    compound_statement: processCompoundStatement,
    if_statement: processIfStatement,
    for_statement: processForStatement,
    while_statement: cStyleWhileProcessor(),
    do_statement: cStyleDoWhileProcessor(),
    switch_statement: processSwitchlike,
    return_statement: processReturnStatement,
    break_statement: processBreakStatement,
    continue_statement: processContinueStatement,
    labeled_statement: processLabeledStatement,
    goto_statement: processGotoStatement,
    comment: processComment,
  },
  default: defaultProcessStatement,
} as const;

export function getStatementHandlers(): StatementHandlers {
  return {
    named: Object.fromEntries(Object.entries(statementHandlers.named)),
    default: statementHandlers.default,
  };
}

export function createCFGBuilder(options: BuilderOptions): CFGBuilder {
  return new GenericCFGBuilder(statementHandlers, options);
}

function processGotoStatement(
  gotoSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const name = gotoSyntax.firstNamedChild?.text as string;
  const gotoNode = ctx.builder.addNode("GOTO", name, gotoSyntax.startIndex);
  ctx.link.syntaxToNode(gotoSyntax, gotoNode);
  return {
    entry: gotoNode,
    exit: null,
    gotos: [{ node: gotoNode, label: name }],
  };
}

function processLabeledStatement(
  labelSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const name = getChildFieldText(labelSyntax, "label");
  const labelNode = ctx.builder.addNode("LABEL", name, labelSyntax.startIndex);
  ctx.link.syntaxToNode(labelSyntax, labelNode);
  const labelContentSyntax = labelSyntax.namedChildren[1];
  if (labelContentSyntax) {
    const { entry: labeledEntry, exit: labeledExit } = ctx.state.update(
      ctx.dispatch.single(labelContentSyntax),
    );
    if (labeledEntry) ctx.builder.addEdge(labelNode, labeledEntry);
    return ctx.state.update({
      entry: labelNode,
      exit: labeledExit,
      labels: new Map([[name, labelNode]]),
    });
  }
  // C allows for empty labels.
  return ctx.state.update({
    entry: labelNode,
    exit: labelNode,
    labels: new Map([[name, labelNode]]),
  });
}

function processContinueStatement(
  continueSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const continueNode = ctx.builder.addNode(
    "CONTINUE",
    "CONTINUE",
    continueSyntax.startIndex,
  );
  ctx.link.syntaxToNode(continueSyntax, continueNode);
  return { entry: continueNode, exit: null, continues: [continueNode] };
}

function processBreakStatement(
  breakSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const breakNode = ctx.builder.addNode(
    "BREAK",
    "BREAK",
    breakSyntax.startIndex,
  );
  ctx.link.syntaxToNode(breakSyntax, breakNode);
  return { entry: breakNode, exit: null, breaks: [breakNode] };
}

function processComment(
  commentSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  // We only ever ger here when marker comments are enabled,
  // and only for marker comments as the rest are filtered out.
  const commentNode = ctx.builder.addNode(
    "MARKER_COMMENT",
    commentSyntax.text,
    commentSyntax.startIndex,
  );
  ctx.link.syntaxToNode(commentSyntax, commentNode);

  if (ctx.options.markerPattern) {
    const marker = commentSyntax.text.match(ctx.options.markerPattern)?.[1];
    if (marker) ctx.builder.addMarker(commentNode, marker);
  }
  return { entry: commentNode, exit: commentNode };
}

function processCompoundStatement(
  syntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const blockBlock = ctx.dispatch.many(syntax.namedChildren);
  ctx.builder.setDefault(blockBlock.entry, { startOffset: syntax.startIndex });
  ctx.link.syntaxToNode(syntax, blockBlock.entry);
  return blockBlock;
}

function processReturnStatement(
  syntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const returnNode = ctx.builder.addNode(
    "RETURN",
    syntax.text,
    syntax.startIndex,
  );
  ctx.link.syntaxToNode(syntax, returnNode);
  return { entry: returnNode, exit: null };
}

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

const caseTypes = new Set(["case_statement"]);

function getCases(switchSyntax: Parser.SyntaxNode): Parser.SyntaxNode[] {
  const switchBody = switchSyntax.namedChildren[1] as Parser.SyntaxNode;
  return switchBody.namedChildren.filter((child) => caseTypes.has(child.type));
}

function parseCase(caseSyntax: Parser.SyntaxNode): {
  isDefault: boolean;
  consequence: Parser.SyntaxNode[];
  hasFallthrough: boolean;
} {
  const isDefault = !caseSyntax.childForFieldName("value");
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
	      body: (compound_statement "{" @opening-brace "}" @closing-brace)
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
