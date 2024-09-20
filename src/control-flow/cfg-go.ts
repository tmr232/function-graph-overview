import Parser from "web-tree-sitter";
import {
  BlockHandler,
  type BasicBlock,
  type BuilderOptions,
  type Case,
  type CFG,
  type EdgeType,
} from "./cfg-defs";
import { Builder } from "./builder";
import { BlockMatcher } from "./block-matcher";
import type { Context } from "./statement-handlers";

interface SwitchOptions {
  noImplicitDefault: boolean;
}

function getChildFieldText(
  node: Parser.SyntaxNode,
  fieldName: string,
): string {
  const child = node.childForFieldName(fieldName);
  return child ? child.text : "";
}

export class CFGBuilder {
  private builder: Builder = new Builder();
  private readonly options: BuilderOptions;

  constructor(options: BuilderOptions) {
    this.options = options;
  }

  public buildCFG(functionNode: Parser.SyntaxNode): CFG {
    const startNode = this.builder.addNode("START", "START");
    const bodyNode = functionNode.childForFieldName("body");

    if (bodyNode) {
      const blockHandler = new BlockHandler();
      const { entry } = blockHandler.update(
        this.processStatements(bodyNode.namedChildren),
      );

      blockHandler.processGotos((gotoNode, labelNode) =>
        this.builder.addEdge(gotoNode, labelNode),
      );

      // `entry` will be non-null for any valid code
      if (entry) this.builder.addEdge(startNode, entry);
    }
    return { graph: this.builder.getGraph(), entry: startNode };
  }



  private processStatements(statements: Parser.SyntaxNode[]): BasicBlock {
    const blockHandler = new BlockHandler();

    // Ignore comments
    const codeStatements = statements.filter((syntax) => {
      if (syntax.type !== "comment") {
        return true;
      }

      return (
        this.options.markerPattern && Boolean(syntax.text.match(this.options.markerPattern))
      );
    });

    if (codeStatements.length === 0) {
      const emptyNode = this.builder.addNode("EMPTY", "empty block");
      return { entry: emptyNode, exit: emptyNode };
    }

    let entry: string | null = null;
    let previous: string | null = null;
    for (const statement of codeStatements) {
      const { entry: currentEntry, exit: currentExit } = blockHandler.update(
        this.processBlock(statement),
      );
      if (!entry) entry = currentEntry;
      if (previous && currentEntry) this.builder.addEdge(previous, currentEntry);
      previous = currentExit;
    }
    return blockHandler.update({ entry, exit: previous });
  }

  private processBlock(node: Parser.SyntaxNode | null): BasicBlock {
    if (!node) return { entry: null, exit: null };

    const matcher = new BlockMatcher(this.processBlock.bind(this));
    const ctx: Context = {
      builder: this.builder,
      matcher: matcher,
      state: matcher.state,
      options: this.options,
      dispatch: {
        single: this.processBlock.bind(this),
        many: this.processStatements.bind(this),
      }
    };

    switch (node.type) {
      case "block":
        return this.processStatements(node.namedChildren);
      case "if_statement":
        return processIfStatement(node, undefined, ctx);
      case "for_statement":
        return processForStatement(node, ctx);
      case "expression_switch_statement":
      case "type_switch_statement":
        return processSwitchlike(node, { noImplicitDefault: false }, ctx);
      case "select_statement":
        return processSwitchlike(node, { noImplicitDefault: true }, ctx);
      case "return_statement": {
        const returnNode = this.builder.addNode("RETURN", node.text);
        return { entry: returnNode, exit: null };
      }
      case "break_statement":
        return processBreakStatement(node, ctx);
      case "continue_statement":
        return processContinueStatement(node, ctx);
      case "labeled_statement":
        return processLabeledStatement(node, ctx);
      case "goto_statement":
        return processGotoStatement(node, ctx);
      case "comment":
        return processComment(node, ctx);
      default: {
        const newNode = this.builder.addNode("STATEMENT", node.text);
        return { entry: newNode, exit: newNode };
      }
    }
  }

}


function processGotoStatement(gotoSyntax: Parser.SyntaxNode, ctx: Context): BasicBlock {
  const name = gotoSyntax.firstNamedChild?.text as string;
  const gotoNode = ctx.builder.addNode("GOTO", name);
  return {
    entry: gotoNode,
    exit: null,
    gotos: [{ node: gotoNode, label: name }],
  };
}
function processLabeledStatement(labelSyntax: Parser.SyntaxNode, ctx: Context): BasicBlock {
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
  _continueSyntax: Parser.SyntaxNode, ctx: Context
): BasicBlock {
  const continueNode = ctx.builder.addNode("CONTINUE", "CONTINUE");
  return { entry: continueNode, exit: null, continues: [continueNode] };
}
function processBreakStatement(_breakSyntax: Parser.SyntaxNode, ctx: Context): BasicBlock {
  const breakNode = ctx.builder.addNode("BREAK", "BREAK");
  return { entry: breakNode, exit: null, breaks: [breakNode] };
}



function processForStatement(forNode: Parser.SyntaxNode, ctx: Context): BasicBlock {
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
      throw new Error(
        `Unsupported for type: ${forNode.firstNamedChild?.type}`,
      );
  }
}

function processIfStatement(
  ifNode: Parser.SyntaxNode,
  mergeNode: string | null = null,
  ctx: Context
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
        processIfStatement(alternativeChild, mergeNode, ctx),
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



function processComment(commentSyntax: Parser.SyntaxNode, ctx: Context): BasicBlock {
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
  ctx: Context
) {
  let fallthrough: string | null = null;
  let previous: string | null = switchHeadNode;
  if (options.noImplicitDefault) {
    // This prevents the linking of the switch head to the merge node.
    // It is required for select statements, as they block until satisfied.
    previous = null;
  }
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
      ctx.builder.addEdge(thisCase.consequenceExit, mergeNode);
    }
    // Update for next case
    fallthrough = thisCase.hasFallthrough ? thisCase.consequenceExit : null;
  });
  // Connect the last node to the merge node.
  // No need to handle `fallthrough` here as it is not allowed for the last case.
  if (previous) {
    ctx.builder.addEdge(previous, mergeNode, "alternative");
  }
}

function collectCases(
  switchSyntax: Parser.SyntaxNode,
  blockHandler: BlockHandler,
  ctx: Context
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