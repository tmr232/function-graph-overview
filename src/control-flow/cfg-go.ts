import type Parser from "web-tree-sitter";
import type { BasicBlock, BuilderOptions, CFGBuilder } from "./cfg-defs";
import {
  getChildFieldText,
  labeledBreakProcessor,
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
} from "./generic-cfg-builder";
import { type SwitchOptions, buildSwitch, collectCases } from "./switch-utils";

const processBreakStatement = labeledBreakProcessor(`
    (break_statement
        (label_name)? @label
    )
    `);

const statementHandlers: StatementHandlers = {
  named: {
    block: processStatementSequence,
    if_statement: processIfStatement,
    for_statement: processForStatement,
    expression_switch_statement: processSwitchStatement,
    type_switch_statement: processSwitchStatement,
    select_statement: processSelectStatement,
    return_statement: processReturnStatement,
    break_statement: processBreakStatement,
    continue_statement: processContinueStatement,
    labeled_statement: processLabeledStatement,
    goto_statement: processGotoStatement,
    comment: processComment,
  },
  default: defaultProcessStatement,
};

export function createCFGBuilder(options: BuilderOptions): CFGBuilder {
  return new GenericCFGBuilder(statementHandlers, options);
}

function processSwitchStatement(
  syntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  return processSwitchlike(syntax, { noImplicitDefault: false }, ctx);
}

function processSelectStatement(
  syntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  return processSwitchlike(syntax, { noImplicitDefault: true }, ctx);
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

function processForStatement(
  forNode: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { state } = ctx;
  switch (forNode.namedChildCount) {
    // One child means only loop body, two children means loop head.
    case 1: {
      const headNode = ctx.builder.addNode(
        "LOOP_HEAD",
        "loop head",
        forNode.startIndex,
      );
      ctx.link.syntaxToNode(forNode, headNode);
      const { entry: bodyEntry, exit: bodyExit } = state.update(
        ctx.dispatch.single(forNode.firstNamedChild),
      );
      if (bodyEntry) ctx.builder.addEdge(headNode, bodyEntry);
      if (bodyExit) ctx.builder.addEdge(bodyExit, headNode);
      const exitNode = ctx.builder.addNode(
        "LOOP_EXIT",
        "loop exit",
        forNode.endIndex,
      );
      state.forEachBreak((breakNode) => {
        ctx.builder.addEdge(breakNode, exitNode);
      });

      state.forEachContinue((continueNode) => {
        ctx.builder.addEdge(continueNode, headNode);
      });
      return state.update({ entry: headNode, exit: exitNode });
    }
    // TODO: Handle the case where there is no loop condition, only init and update.
    case 2: {
      const headNode = ctx.builder.addNode(
        "LOOP_HEAD",
        "loop head",
        forNode.startIndex,
      );
      ctx.link.syntaxToNode(forNode, headNode);
      const { entry: bodyEntry, exit: bodyExit } = state.update(
        ctx.dispatch.single(forNode.namedChildren[1] as Parser.SyntaxNode),
      );
      const exitNode = ctx.builder.addNode(
        "LOOP_EXIT",
        "loop exit",
        forNode.endIndex,
      );
      if (bodyEntry) {
        ctx.builder.addEdge(headNode, bodyEntry, "consequence");
      }
      ctx.builder.addEdge(headNode, exitNode, "alternative");
      if (bodyExit) ctx.builder.addEdge(bodyExit, headNode);
      state.forEachBreak((breakNode) => {
        ctx.builder.addEdge(breakNode, exitNode);
      }, ctx.extra?.label);

      state.forEachContinue((continueNode) => {
        ctx.builder.addEdge(continueNode, headNode);
      }, ctx.extra?.label);
      return state.update({ entry: headNode, exit: exitNode });
    }
    default:
      throw new Error(`Unsupported for type: ${forNode.firstNamedChild?.type}`);
  }
}

function processIfStatement(
  ifNode: Parser.SyntaxNode,
  ctx: Context,
  mergeNode: string | null = null,
): BasicBlock {
  const conditionChild = ifNode.childForFieldName("condition");
  const conditionNode = ctx.builder.addNode(
    "CONDITION",
    conditionChild ? conditionChild.text : "Unknown condition",
    ifNode.startIndex,
  );
  ctx.link.syntaxToNode(ifNode, conditionNode);

  mergeNode ??= ctx.builder.addNode("MERGE", "MERGE", ifNode.endIndex);

  const consequenceChild = ifNode.childForFieldName(
    "consequence",
  ) as Parser.SyntaxNode;

  const { entry: thenEntry, exit: thenExit } = ctx.state.update(
    ctx.dispatch.single(consequenceChild),
  );
  ctx.link.syntaxToNode(consequenceChild, thenEntry);

  ctx.builder.addEdge(conditionNode, thenEntry || mergeNode, "consequence");
  if (thenExit) ctx.builder.addEdge(thenExit, mergeNode);

  const alternativeChild = ifNode.childForFieldName("alternative");
  if (alternativeChild) {
    ctx.link.offsetToSyntax(consequenceChild, alternativeChild);
    const elseIf = alternativeChild.type === "if_statement";
    const { entry: elseEntry, exit: elseExit } = (() => {
      if (elseIf) {
        return ctx.state.update(
          processIfStatement(alternativeChild, ctx, mergeNode),
        );
      }
      return ctx.state.update(ctx.dispatch.single(alternativeChild));
    })();

    if (elseEntry) {
      ctx.builder.addEdge(conditionNode, elseEntry, "alternative");
      if (elseExit && !elseIf) ctx.builder.addEdge(elseExit, mergeNode);
    }
  } else {
    ctx.builder.addEdge(conditionNode, mergeNode, "alternative");
  }

  return ctx.state.update({ entry: conditionNode, exit: mergeNode });
}

const caseTypes = new Set([
  "default_case",
  "communication_case",
  "type_case",
  "expression_case",
]);

function getCases(switchSyntax: Parser.SyntaxNode): Parser.SyntaxNode[] {
  return switchSyntax.namedChildren.filter((child) =>
    caseTypes.has(child.type),
  );
}

function parseCase(caseSyntax: Parser.SyntaxNode): {
  isDefault: boolean;
  consequence: Parser.SyntaxNode[];
  hasFallthrough: boolean;
} {
  const isDefault = caseSyntax.type === "default_case";
  const consequence = caseSyntax.namedChildren.slice(isDefault ? 0 : 1);
  const hasFallthrough = consequence
    .map((node) => node.type)
    .includes("fallthrough_statement");
  return { isDefault, consequence, hasFallthrough };
}

function processSwitchlike(
  switchSyntax: Parser.SyntaxNode,
  options: SwitchOptions,
  ctx: Context,
): BasicBlock {
  const blockHandler = ctx.matcher.state;

  const cases = collectCases(switchSyntax, ctx, { parseCase, getCases });
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
  buildSwitch(cases, mergeNode, headNode, options, ctx);

  blockHandler.forEachBreak((breakNode) => {
    ctx.builder.addEdge(breakNode, mergeNode);
  });

  const braceMatch = ctx.matcher.match(
    switchSyntax,
    `(_ "{" @opening-brace "}" @closing-brace) @switch`,
    { maxStartDepth: 1 },
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
