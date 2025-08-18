import type { Node as SyntaxNode } from "web-tree-sitter";
import treeSitterC from "../../parsers/tree-sitter-c.wasm?url";
import type { BasicBlock, BuilderOptions, CFGBuilder } from "./cfg-defs";
import {
  cStyleDoWhileProcessor,
  cStyleForStatementProcessor,
  cStyleIfProcessor,
  cStyleWhileProcessor,
  processBreakStatement,
  processComment,
  processContinueStatement,
  processGotoStatement,
  processLabeledStatement,
  processReturnStatement,
  processStatementSequence,
} from "./common-patterns.ts";
import {
  type Context,
  GenericCFGBuilder,
  type StatementHandlers,
} from "./generic-cfg-builder.ts";
import { treeSitterNoNullNodes } from "./hacks.ts";
import { extractTaggedValueFromTreeSitterQuery } from "./query-utils.ts";
import { buildSwitch, collectCases } from "./switch-utils.ts";

export const cLanguageDefinition = {
  wasmPath: treeSitterC,
  createCFGBuilder: createCFGBuilder,
  functionNodeTypes: ["function_definition"],
};

function getChildFieldText(node: SyntaxNode, fieldName: string): string {
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
    compound_statement: processStatementSequence,
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

function defaultProcessStatement(syntax: SyntaxNode, ctx: Context): BasicBlock {
  const newNode = ctx.builder.addNode(
    "STATEMENT",
    syntax.text,
    syntax.startIndex,
  );
  ctx.link.syntaxToNode(syntax, newNode);
  return { entry: newNode, exit: newNode };
}

const caseTypes = new Set(["case_statement"]);

function getCases(switchSyntax: SyntaxNode): SyntaxNode[] {
  const switchBody = switchSyntax.namedChildren[1] as SyntaxNode;
  return treeSitterNoNullNodes(switchBody.namedChildren).filter((child) =>
    caseTypes.has(child.type),
  );
}

function parseCase(caseSyntax: SyntaxNode): {
  isDefault: boolean;
  consequence: SyntaxNode[];
  hasFallthrough: boolean;
} {
  const isDefault = !caseSyntax.childForFieldName("value");
  const consequence = treeSitterNoNullNodes(caseSyntax.namedChildren).slice(
    isDefault ? 0 : 1,
  );
  const hasFallthrough = true;
  return { isDefault, consequence, hasFallthrough };
}

function processSwitchlike(switchSyntax: SyntaxNode, ctx: Context): BasicBlock {
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

const functionQuery = {
  functionDeclarator: `(function_declarator
	  declarator:(identifier)@name)`,

  tag: "name",
};

export function extractCFunctionName(func: SyntaxNode): string | undefined {
  const name = extractTaggedValueFromTreeSitterQuery(
    func,
    functionQuery.functionDeclarator,
    functionQuery.tag,
  );
  return name.length > 1 ? undefined : name[0];
}
