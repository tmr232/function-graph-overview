import Parser from "web-tree-sitter";
import {
  BlockHandler,
  type BasicBlock,
  type BuilderOptions,
  type Case,
  type CFG,
  type EdgeType,
} from "./cfg-defs";
import { BlockMatcher, Match } from "./block-matcher.ts";
import { Builder } from "./builder.ts";
import type { Context, StatementHandlers } from "./statement-handlers.ts";

function getChildFieldText(node: Parser.SyntaxNode, fieldName: string): string {
  const child = node.childForFieldName(fieldName);
  return child ? child.text : "";
}


const statementHandlers: StatementHandlers = {
  named: {
    compound_statement: processCompoundStatement,
    if_statement: processIfStatement,
    for_statement: processForStatement,
    while_statement: processWhileStatement,
    do_statement: processDoStatement,
    switch_statement: processSwitchlike,
    return_statement: processReturnStatement,
    break_statement: processBreakStatement,
    continue_statement: processContinueStatement,
    labeled_statement: processLabeledStatement,
    goto_statement: processGotoStatement,
    comment: processComment,
  },
  default: defaultProcessStatement,
};
export class CFGBuilder {
  private builder: Builder = new Builder();
  private readonly flatSwitch: boolean;
  private readonly markerPattern: RegExp | null;
  private readonly options: BuilderOptions;

  constructor(options: BuilderOptions) {
    this.options = options;
    this.flatSwitch = options.flatSwitch ?? false;
    this.markerPattern = options.markerPattern ?? null;
  }

  public buildCFG(functionNode: Parser.SyntaxNode): CFG {
    const startNode = this.builder.addNode("START", "START");

    const bodySyntax = functionNode.childForFieldName("body");
    if (bodySyntax) {
      const blockHandler = new BlockHandler();
      const { entry } = blockHandler.update(
        this.processStatements(bodySyntax.namedChildren),
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
        this.markerPattern && Boolean(syntax.text.match(this.markerPattern))
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
      if (previous && currentEntry)
        this.builder.addEdge(previous, currentEntry);
      previous = currentExit;
    }
    return blockHandler.update({ entry, exit: previous });
  }

  private processBlock(syntax: Parser.SyntaxNode | null): BasicBlock {
    if (!syntax) return { entry: null, exit: null };

    const handler =
      statementHandlers.named[syntax.type] ??
      statementHandlers.default;
    const matcher = new BlockMatcher(this.processBlock.bind(this));
    return handler(syntax, {
      builder: this.builder,
      matcher: matcher,
      state: matcher.state,
      options: this.options,
      dispatch: {
        single: this.processBlock.bind(this),
        many: this.processStatements.bind(this),
      },
    });
  }
}


function collectCases(switchSyntax: Parser.SyntaxNode, ctx: Context): Case[] {
  const cases: Case[] = [];
  const caseTypes = ["case_statement"];
  switchSyntax.namedChildren[1].namedChildren
    .filter((child) => caseTypes.includes(child.type))
    .forEach((caseSyntax) => {
      const isDefault = !caseSyntax.childForFieldName("value");

      const consequence = caseSyntax.namedChildren.slice(isDefault ? 0 : 1);
      const hasFallthrough = true;

      const conditionNode = ctx.builder.addNode(
        "CASE_CONDITION",
        isDefault ? "default" : (caseSyntax.firstNamedChild?.text ?? ""),
      );

      const consequenceBlock = ctx.matcher.state.update(
        ctx.dispatch.many(consequence),
      );

      cases.push({
        conditionEntry: conditionNode,
        conditionExit: conditionNode,
        consequenceEntry: consequenceBlock.entry,
        consequenceExit: consequenceBlock.exit,
        alternativeExit: conditionNode,
        hasFallthrough,
        isDefault,
      });
    });

  return cases;
}

function buildSwitch(
  cases: Case[],
  mergeNode: string,
  switchHeadNode: string,
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
          // If we have any default node - then we don't connect the head to the merge node.
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
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (fallthrough) {
    ctx.builder.addEdge(fallthrough, mergeNode, "regular");
  }
}

function processSwitchlike(
  switchSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const blockHandler = ctx.matcher.state;

  const cases = collectCases(switchSyntax, ctx);
  const headNode = ctx.builder.addNode(
    "SWITCH_CONDITION",
    getChildFieldText(switchSyntax, "value"),
  );
  const mergeNode: string = ctx.builder.addNode("SWITCH_MERGE", "");
  buildSwitch(cases, mergeNode, headNode, ctx);

  blockHandler.forEachBreak((breakNode) => {
    ctx.builder.addEdge(breakNode, mergeNode);
  });

  return blockHandler.update({ entry: headNode, exit: mergeNode });
}

function processForStatement(
  forNode: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const queryString = `
    (for_statement
        initializer: (_)? @init
        condition: (_)? @cond
        update: (_)? @update
        body: (_) @body) @for
    `;
  const match = ctx.matcher.match(forNode, queryString);

  const initSyntax = match.getSyntax("init");
  const condSyntax = match.getSyntax("cond");
  const updateSyntax = match.getSyntax("update");
  const bodySyntax = match.getSyntax("body");

  const initBlock = match.getBlock(initSyntax);
  const condBlock = match.getBlock(condSyntax);
  const updateBlock = match.getBlock(updateSyntax);
  const bodyBlock = match.getBlock(bodySyntax);

  const entryNode = ctx.builder.addNode("EMPTY", "loop head");
  const exitNode = ctx.builder.addNode("FOR_EXIT", "loop exit");
  const headNode = ctx.builder.addNode("LOOP_HEAD", "loop head");
  const headBlock = { entry: headNode, exit: headNode };

  const chain = (entry: string | null, blocks: (BasicBlock | null)[]) => {
    let prevExit: string | null = entry;
    for (const block of blocks) {
      if (!block) continue;
      if (prevExit && block.entry) ctx.builder.addEdge(prevExit, block.entry);
      prevExit = block.exit;
    }
    return prevExit;
  };

  /*
  entry -> init -> cond +-> body -> head -> update -> cond
                        --> exit

  top = chain(entry, init,)

  if cond:
      chain(top, cond)
      cond +-> body
      cond --> exit
      chain(body, head, update, cond)
  else:
      chain(top, body, head, update, body)

  chain(continue, head)
  chain(break, exit)
  */
  const topExit = chain(entryNode, [initBlock]);
  if (condBlock) {
    chain(topExit, [condBlock]);
    if (condBlock.exit) {
      if (bodyBlock?.entry)
        ctx.builder.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
      ctx.builder.addEdge(condBlock.exit, exitNode, "alternative");
      chain(bodyBlock?.exit ?? null, [headBlock, updateBlock, condBlock]);
    }
  } else {
    chain(topExit, [bodyBlock, headBlock, updateBlock, bodyBlock]);
  }

  ctx.matcher.state.forEachContinue((continueNode) => {
    ctx.builder.addEdge(continueNode, headNode);
  });

  ctx.matcher.state.forEachBreak((breakNode) => {
    ctx.builder.addEdge(breakNode, exitNode);
  });

  return ctx.matcher.update({ entry: entryNode, exit: exitNode });
}

function processIfStatement(
  ifSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const queryString = `
      (if_statement
        condition: (_) @cond
        consequence: (_) @then
        alternative: (
            else_clause ([
                (if_statement) @else-if
                (compound_statement) @else-body
                ])
        )? @else
      )@if
  `;

  const getIfs = (currentSyntax: Parser.SyntaxNode): Match[] => {
    const match = ctx.matcher.tryMatch(currentSyntax, queryString);
    if (!match) return [];
    const elseifSyntax = match.getSyntax("else-if");
    if (!elseifSyntax) return [match];
    return [match, ...getIfs(elseifSyntax)];
  };

  const blocks = getIfs(ifSyntax).map((ifMatch) => ({
    condBlock: ifMatch.getBlock(ifMatch.requireSyntax("cond")),
    thenBlock: ifMatch.getBlock(ifMatch.requireSyntax("then")),
    elseBlock: ifMatch.getBlock(ifMatch.getSyntax("else-body")),
  }));

  const headNode = ctx.builder.addNode("CONDITION", "if-else head");
  const mergeNode = ctx.builder.addNode("MERGE", "if-else merge");

  if (blocks[0].condBlock?.entry)
    ctx.builder.addEdge(headNode, blocks[0].condBlock.entry);

  let previous: string | null | undefined = null;
  for (const { condBlock, thenBlock } of blocks) {
    if (previous && condBlock?.entry) {
      ctx.builder.addEdge(previous, condBlock.entry, "alternative");
    }
    if (condBlock?.exit && thenBlock?.entry) {
      ctx.builder.addEdge(condBlock.exit, thenBlock.entry, "consequence");
    }
    if (thenBlock?.exit) {
      ctx.builder.addEdge(thenBlock.exit, mergeNode);
    }

    previous = condBlock?.exit;
  }

  function last<T>(items: T[]): T | undefined {
    return items[items.length - 1];
  }

  const elseBlock = last(blocks)?.elseBlock;
  if (elseBlock) {
    if (previous && elseBlock.entry) {
      ctx.builder.addEdge(previous, elseBlock.entry, "alternative");
    }
    if (elseBlock.exit) ctx.builder.addEdge(elseBlock.exit, mergeNode);
  } else if (previous) {
    ctx.builder.addEdge(previous, mergeNode, "alternative");
  }

  return ctx.matcher.update({ entry: headNode, exit: mergeNode });
}

function processWhileStatement(
  whileSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const queryString = `
  (while_statement
      condition: (_) @cond
      body: (_) @body
      ) @while
  `;
  const match = ctx.matcher.match(whileSyntax, queryString);

  const condSyntax = match.getSyntax("cond");
  const bodySyntax = match.getSyntax("body");

  const condBlock = match.getBlock(condSyntax) as BasicBlock;
  const bodyBlock = match.getBlock(bodySyntax) as BasicBlock;

  const exitNode = ctx.builder.addNode("FOR_EXIT", "loop exit");

  if (condBlock.exit) {
    if (bodyBlock.entry)
      ctx.builder.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
    ctx.builder.addEdge(condBlock.exit, exitNode, "alternative");
  }
  if (condBlock.entry && bodyBlock.exit)
    ctx.builder.addEdge(bodyBlock.exit, condBlock.entry);

  ctx.matcher.state.forEachContinue((continueNode) => {
    if (condBlock.entry) ctx.builder.addEdge(continueNode, condBlock.entry);
  });

  ctx.matcher.state.forEachBreak((breakNode) => {
    ctx.builder.addEdge(breakNode, exitNode);
  });

  return ctx.matcher.update({ entry: condBlock.entry, exit: exitNode });
}

function processDoStatement(
  whileSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const queryString = `
  (do_statement
      body: (_) @body
      condition: (_) @cond
      ) @while
  `;

  const match = ctx.matcher.match(whileSyntax, queryString);

  const condSyntax = match.getSyntax("cond");
  const bodySyntax = match.getSyntax("body");

  const condBlock = match.getBlock(condSyntax) as BasicBlock;
  const bodyBlock = match.getBlock(bodySyntax) as BasicBlock;

  const exitNode = ctx.builder.addNode("FOR_EXIT", "loop exit");

  if (condBlock.exit) {
    if (bodyBlock.entry)
      ctx.builder.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
    ctx.builder.addEdge(condBlock.exit, exitNode, "alternative");
  }
  if (condBlock.entry && bodyBlock.exit)
    ctx.builder.addEdge(bodyBlock.exit, condBlock.entry);

  ctx.matcher.state.forEachContinue((continueNode) => {
    if (condBlock.entry) ctx.builder.addEdge(continueNode, condBlock.entry);
  });

  ctx.matcher.state.forEachBreak((breakNode) => {
    ctx.builder.addEdge(breakNode, exitNode);
  });

  return ctx.matcher.update({ entry: bodyBlock.entry, exit: exitNode });
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
  const blockHandler = new BlockHandler();
  const name = getChildFieldText(labelSyntax, "label");
  const labelNode = ctx.builder.addNode("LABEL", name);
  const { entry: labeledEntry, exit: labeledExit } = blockHandler.update(
    ctx.dispatch.single(labelSyntax.namedChildren[1]),
  );
  if (labeledEntry) ctx.builder.addEdge(labelNode, labeledEntry);
  return blockHandler.update({
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

function processCompoundStatement(
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
