import Parser from "web-tree-sitter";
import {
  BlockHandler,
  type BasicBlock,
  type BuilderOptions,
  type Case,
  type CFGBuilder,
  type EdgeType,
} from "./cfg-defs";
import type { Context, StatementHandlers } from "./statement-handlers";
import { GenericCFGBuilder } from "./generic-cfg-builder";

interface SwitchOptions {
  noImplicitDefault: boolean;
}

function getChildFieldText(node: Parser.SyntaxNode, fieldName: string): string {
  const child = node.childForFieldName(fieldName);
  return child ? child.text : "";
}

const statementHandlers: StatementHandlers = {
  named: {
    block: processBlockStatement,
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

function processBlockStatement(
  syntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  return ctx.dispatch.many(syntax.namedChildren);
}

function processReturnStatement(
  syntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const returnNode = ctx.builder.addNode("RETURN", syntax.text);
  return { entry: returnNode, exit: null };
}
function defaultProcessStatement(
  syntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const newNode = ctx.builder.addNode("STATEMENT", syntax.text);
  return { entry: newNode, exit: newNode };
}

function processGotoStatement(
  gotoSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const name = gotoSyntax.firstNamedChild?.text as string;
  const gotoNode = ctx.builder.addNode("GOTO", name);
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
  const labelNode = ctx.builder.addNode("LABEL", name);
  const { entry: labeledEntry, exit: labeledExit } = ctx.state.update(
    ctx.dispatch.single(labelSyntax.namedChildren[1]),
  );
  if (labeledEntry) ctx.builder.addEdge(labelNode, labeledEntry);
  return ctx.state.update({
    entry: labelNode,
    exit: labeledExit,
    labels: new Map([[name, labelNode]]),
  });
}

function processContinueStatement(
  _continueSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const continueNode = ctx.builder.addNode("CONTINUE", "CONTINUE");
  return { entry: continueNode, exit: null, continues: [continueNode] };
}
function processBreakStatement(
  _breakSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const breakNode = ctx.builder.addNode("BREAK", "BREAK");
  return { entry: breakNode, exit: null, breaks: [breakNode] };
}

function processForStatement(
  forNode: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { state } = ctx;
  switch (forNode.namedChildCount) {
    // One child means only loop body, two children means loop head.
    case 1: {
      const headNode = ctx.builder.addNode("LOOP_HEAD", "loop head");
      const { entry: bodyEntry, exit: bodyExit } = state.update(
        ctx.dispatch.single(forNode.firstNamedChild),
      );
      if (bodyEntry) ctx.builder.addEdge(headNode, bodyEntry);
      if (bodyExit) ctx.builder.addEdge(bodyExit, headNode);
      const exitNode = ctx.builder.addNode("LOOP_EXIT", "loop exit");
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
      const headNode = ctx.builder.addNode("LOOP_HEAD", "loop head");
      const { entry: bodyEntry, exit: bodyExit } = state.update(
        ctx.dispatch.single(forNode.namedChildren[1]),
      );
      const exitNode = ctx.builder.addNode("LOOP_EXIT", "loop exit");
      if (bodyEntry) {
        ctx.builder.addEdge(headNode, bodyEntry, "consequence");
      }
      ctx.builder.addEdge(headNode, exitNode, "alternative");
      if (bodyExit) ctx.builder.addEdge(bodyExit, headNode);
      state.forEachBreak((breakNode) => {
        ctx.builder.addEdge(breakNode, exitNode);
      });

      state.forEachContinue((continueNode) => {
        ctx.builder.addEdge(continueNode, headNode);
      });
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
  );

  mergeNode ??= ctx.builder.addNode("MERGE", "MERGE");

  const consequenceChild = ifNode.childForFieldName("consequence");

  const { entry: thenEntry, exit: thenExit } = ctx.state.update(
    ctx.dispatch.single(consequenceChild),
  );

  const alternativeChild = ifNode.childForFieldName("alternative");
  const elseIf = alternativeChild?.type === "if_statement";
  const { entry: elseEntry, exit: elseExit } = (() => {
    if (elseIf) {
      return ctx.state.update(
        processIfStatement(alternativeChild, ctx, mergeNode),
      );
    } else {
      return ctx.state.update(ctx.dispatch.single(alternativeChild));
    }
  })();

  ctx.builder.addEdge(conditionNode, thenEntry || mergeNode, "consequence");
  if (thenExit) ctx.builder.addEdge(thenExit, mergeNode);

  if (elseEntry) {
    ctx.builder.addEdge(conditionNode, elseEntry, "alternative");
    if (elseExit && !elseIf) ctx.builder.addEdge(elseExit, mergeNode);
  } else {
    ctx.builder.addEdge(conditionNode, mergeNode, "alternative");
  }

  return ctx.state.update({ entry: conditionNode, exit: mergeNode });
}

function processComment(
  commentSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  // We only ever ger here when marker comments are enabled,
  // and only for marker comments as the rest are filtered out.
  const commentNode = ctx.builder.addNode("MARKER_COMMENT", commentSyntax.text);
  if (ctx.options.markerPattern) {
    const marker = commentSyntax.text.match(ctx.options.markerPattern)?.[1];
    if (marker) ctx.builder.addMarker(commentNode, marker);
  }
  return { entry: commentNode, exit: commentNode };
}

function buildSwitch(
  cases: Case[],
  mergeNode: string,
  switchHeadNode: string,
  options: SwitchOptions,
  ctx: Context,
) {
  let fallthrough: string | null = null;
  let previous: string | null = switchHeadNode;
  cases.forEach((thisCase) => {
    if (ctx.options.flatSwitch) {
      if (thisCase.consequenceEntry) {
        ctx.builder.addEdge(switchHeadNode, thisCase.consequenceEntry);
        if (fallthrough) {
          ctx.builder.addEdge(fallthrough, thisCase.consequenceEntry);
        }
        if (thisCase.isDefault) {
          previous = null;
        }
      }
    } else {
      if (fallthrough && thisCase.consequenceEntry) {
        ctx.builder.addEdge(fallthrough, thisCase.consequenceEntry);
      }
      if (previous && thisCase.conditionEntry) {
        ctx.builder.addEdge(
          previous,
          thisCase.conditionEntry,
          "alternative" as EdgeType,
        );
      }

      if (thisCase.consequenceEntry && thisCase.conditionExit)
        ctx.builder.addEdge(
          thisCase.conditionExit,
          thisCase.consequenceEntry,
          "consequence",
        );

      // Update for next case
      previous = thisCase.isDefault ? null : thisCase.alternativeExit;
    }

    // Fallthrough is the same for both flat and non-flat layouts.
    if (!thisCase.hasFallthrough && thisCase.consequenceExit) {
      ctx.builder.addEdge(thisCase.consequenceExit, mergeNode, "regular");
    }
    // Update for next case
    fallthrough = thisCase.hasFallthrough ? thisCase.consequenceExit : null;
  });
  // Connect the last node to the merge node.
  // No need to handle `fallthrough` here as it is not allowed for the last case.
  if (previous && !options.noImplicitDefault) {
    ctx.builder.addEdge(previous, mergeNode, "alternative");
  }
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (fallthrough) {
    ctx.builder.addEdge(fallthrough, mergeNode, "regular");
  }
}

function collectCases(
  switchSyntax: Parser.SyntaxNode,
  blockHandler: BlockHandler,
  ctx: Context,
): Case[] {
  const cases: Case[] = [];
  const caseTypes = [
    "default_case",
    "communication_case",
    "type_case",
    "expression_case",
  ];
  switchSyntax.namedChildren
    .filter((child) => caseTypes.includes(child.type))
    .forEach((caseSyntax) => {
      const isDefault = caseSyntax.type === "default_case";

      const consequence = caseSyntax.namedChildren.slice(isDefault ? 0 : 1);
      const hasFallthrough = consequence
        .map((node) => node.type)
        .includes("fallthrough_statement");

      const conditionNode = ctx.builder.addNode(
        "CASE_CONDITION",
        isDefault ? "default" : (caseSyntax.firstNamedChild?.text ?? ""),
      );
      const consequenceNode = blockHandler.update(
        ctx.dispatch.many(consequence),
      );

      cases.push({
        conditionEntry: conditionNode,
        conditionExit: conditionNode,
        consequenceEntry: consequenceNode.entry,
        consequenceExit: consequenceNode.exit,
        alternativeExit: conditionNode,
        hasFallthrough,
        isDefault,
      });
    });

  return cases;
}

function processSwitchlike(
  switchSyntax: Parser.SyntaxNode,
  options: SwitchOptions,
  ctx: Context,
): BasicBlock {
  const blockHandler = new BlockHandler();

  const cases = collectCases(switchSyntax, blockHandler, ctx);
  const headNode = ctx.builder.addNode(
    "SWITCH_CONDITION",
    getChildFieldText(switchSyntax, "value"),
  );
  const mergeNode: string = ctx.builder.addNode("SWITCH_MERGE", "");
  buildSwitch(cases, mergeNode, headNode, options, ctx);

  blockHandler.forEachBreak((breakNode) => {
    ctx.builder.addEdge(breakNode, mergeNode);
  });

  return blockHandler.update({ entry: headNode, exit: mergeNode });
}
