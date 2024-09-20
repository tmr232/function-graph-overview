import Parser from "web-tree-sitter";
import {
  type BasicBlock,
  BlockHandler,
  type BuilderOptions,
  type CFG,
} from "./cfg-defs";
import { Builder } from "./builder.ts";
import { BlockMatcher, matchExistsIn } from "./block-matcher.ts";
import type { Context, StatementHandlers } from "./statement-handlers.ts";

const statementHandlers: StatementHandlers = {
  named: {
    if_statement: processIfStatement,
    for_statement: processForStatement,
    while_statement: processWhileStatement,
    match_statement: processMatchStatement,
    return_statement: processReturnStatement,
    break_statement: processBreakStatement,
    continue_statement: processContinueStatement,
    comment: processComment,
    with_statement: processWithStatement,
    try_statement: processTryStatement,
    raise_statement: processRaiseStatement,
    block: processBlockStatement,
  },
  default: defaultProcessStatement,
};

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
      const { entry, exit } = blockHandler.update(
        this.processStatements(bodyNode.namedChildren),
      );

      const endNode = this.builder.addNode("RETURN", "implicit return");
      // `entry` will be non-null for any valid code
      if (entry) this.builder.addEdge(startNode, entry);
      if (exit) this.builder.addEdge(exit, endNode);
    }
    return { graph: this.builder.getGraph(), entry: startNode };
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

  private processStatements(statements: Parser.SyntaxNode[]): BasicBlock {
    const blockHandler = new BlockHandler();
    // Ignore comments
    const codeStatements = statements.filter((syntax) => {
      if (syntax.type !== "comment") {
        return true;
      }

      return (
        this.options.markerPattern &&
        Boolean(syntax.text.match(this.options.markerPattern))
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
}

function defaultProcessStatement(
  syntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder } = ctx;
  const hasYield = matchExistsIn(syntax, "yield", `(yield) @yield`);
  if (hasYield) {
    const yieldNode = builder.addNode("YIELD", syntax.text);
    return { entry: yieldNode, exit: yieldNode };
  }
  const newNode = builder.addNode("STATEMENT", syntax.text);
  return { entry: newNode, exit: newNode };
}
function processRaiseStatement(
  raiseSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder } = ctx;
  const raiseNode = builder.addNode("THROW", raiseSyntax.text);
  return { entry: raiseNode, exit: null };
}
function processReturnStatement(
  returnSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder } = ctx;
  const returnNode = builder.addNode("RETURN", returnSyntax.text);
  return { entry: returnNode, exit: null, returns: [returnNode] };
}
function processTryStatement(
  trySyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder, matcher } = ctx;
  /*
  Here's an idea - I can duplicate the finally blocks!
  Then if there's a return, I stick the finally before it.
  In other cases, the finally is after the end of the try-body.
  This is probably the best course of action.
  */
  const match = matcher.match(
    trySyntax,
    `
      (try_statement
        body: (block) @try-body
          (except_clause 
            (_)? @except-pattern
            (block) @except-body
          )* @except
          (else_clause body: (block) @else-body)? @else
          (finally_clause (block) @finally-body)? @finally
      ) @try
      `,
  );

  const bodySyntax = match.getSyntax("try-body");
  const exceptSyntaxMany = match.getSyntaxMany("except-body");
  const elseSyntax = match.getSyntax("else-body");
  const finallySyntax = match.getSyntax("finally-body");

  const mergeNode = builder.addNode("MERGE", "merge try-complex");

  return builder.withCluster("try-complex", (tryComplexCluster) => {
    const bodyBlock = builder.withCluster("try", () =>
      match.getBlock(bodySyntax),
    ) as BasicBlock;

    // We handle `except` blocks before the `finally` block to support `return` handling.
    const exceptBlocks = exceptSyntaxMany.map((exceptSyntax) =>
      builder.withCluster(
        "except",
        () => match.getBlock(exceptSyntax) as BasicBlock,
      ),
    );
    // We attach the except-blocks to the top of the `try` body.
    // In the rendering, we will connect them to the side of the node, and use invisible lines for it.
    if (bodyBlock.entry) {
      const headNode = bodyBlock.entry;
      exceptBlocks.forEach((exceptBlock) => {
        if (exceptBlock.entry) {
          // Yes, this is effectively a head-to-head link. But that's ok.
          builder.addEdge(headNode, exceptBlock.entry, "exception");
        }
      });
    }

    // Create the `else` block before `finally` to handle returns correctly.
    const elseBlock = match.getBlock(elseSyntax);

    const finallyBlock = builder.withCluster("finally", () => {
      // Handle all the return statements from the try block
      if (finallySyntax) {
        // This is only relevant if there's a finally block.
        matcher.state.forEachReturn((returnNode) => {
          // We create a new finally block for each return node,
          // so that we can link them.
          const duplicateFinallyBlock = match.getBlock(
            finallySyntax,
          ) as BasicBlock;
          // We also clone the return node, to place it _after_ the finally block
          // We also override the cluster node, pulling it up to the `try-complex`,
          // as the return is neither in a `try`, `except`, or `finally` context.
          const returnNodeClone = builder.cloneNode(returnNode, {
            cluster: tryComplexCluster,
          });

          if (duplicateFinallyBlock.entry)
            builder.addEdge(returnNode, duplicateFinallyBlock.entry);
          if (duplicateFinallyBlock.exit)
            builder.addEdge(duplicateFinallyBlock.exit, returnNodeClone);

          // We return the cloned return node as the new return node, in case we're nested
          // in a scope that will process it.
          return returnNodeClone;
        });
      }

      // Handle the finally-block for the trivial case, where we just pass through the try block
      // This must happen AFTER handling the return statements, as the finally block may add return
      // statements of its own.
      const finallyBlock = match.getBlock(finallySyntax);
      return finallyBlock;
    });

    // This is the exit we get to if we don't have an exception
    let happyExit: string | null = bodyBlock.exit;

    // Connect the body to the `else` block
    if (bodyBlock.exit && elseBlock?.entry) {
      builder.addEdge(bodyBlock.exit, elseBlock.entry);
      happyExit = elseBlock.exit;
    }

    if (finallyBlock?.entry) {
      // Connect `try` to `finally`
      const toFinally = elseBlock?.exit ?? bodyBlock.exit;
      if (toFinally) builder.addEdge(toFinally, finallyBlock.entry);
      happyExit = finallyBlock.exit;
      // Connect `except` to `finally`
      exceptBlocks.forEach((exceptBlock) => {
        if (exceptBlock.exit)
          builder.addEdge(exceptBlock.exit, finallyBlock.entry as string);
      });
    } else {
      // We need to connect the `except` blocks to the merge node
      exceptBlocks.forEach((exceptBlock) => {
        if (exceptBlock.exit) builder.addEdge(exceptBlock.exit, mergeNode);
      });
    }

    if (happyExit) builder.addEdge(happyExit, mergeNode);

    return matcher.update({
      entry: bodyBlock.entry,
      exit: mergeNode,
    });
  });
}
function processWithStatement(
  withSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder, matcher } = ctx;
  const match = matcher.match(
    withSyntax,
    `
      (with_statement
        (with_clause) @with_clause
          body: (block) @body
      ) @with
      `,
  );

  const withClauseSyntax = match.getSyntax("with_clause");
  const withClauseBlock = match.getBlock(withClauseSyntax) as BasicBlock;
  return builder.withCluster("with", () => {
    const bodySyntax = match.getSyntax("body");
    const bodyBlock = match.getBlock(bodySyntax) as BasicBlock;

    if (withClauseBlock.exit && bodyBlock.entry)
      builder.addEdge(withClauseBlock.exit, bodyBlock.entry);

    return matcher.state.update({
      entry: withClauseBlock.entry,
      exit: bodyBlock.exit,
    });
  });
}

function processComment(
  commentSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder, options } = ctx;
  // We only ever ger here when marker comments are enabled,
  // and only for marker comments as the rest are filtered out.
  const commentNode = builder.addNode("MARKER_COMMENT", commentSyntax.text);
  if (options.markerPattern) {
    const marker = commentSyntax.text.match(options.markerPattern)?.[1];
    if (marker) builder.addMarker(commentNode, marker);
  }
  return { entry: commentNode, exit: commentNode };
}

function processMatchStatement(
  matchSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder, matcher, options } = ctx;
  const match = matcher.match(
    matchSyntax,
    `
      (match_statement
        subject: (_) @subject
          body: (block 
            alternative: (case_clause)+  @case
          )
      ) @match
      `,
  );

  const subjectSyntax = match.getSyntax("subject");
  const alternatives = match.getSyntaxMany("case").map((caseSyntax) => {
    const patterns = caseSyntax.children.filter(
      (c) => c.type === "case_pattern",
    ) as Parser.SyntaxNode[];
    const consequence = caseSyntax.childForFieldName(
      "consequence",
    ) as Parser.SyntaxNode;
    return { consequence, patterns };
  });

  const subjectBlock = match.getBlock(subjectSyntax) as BasicBlock;
  const mergeNode = builder.addNode("MERGE", "match merge");

  // This is the case where case matches
  if (subjectBlock.exit)
    builder.addEdge(subjectBlock.exit, mergeNode, "alternative");

  let previous = subjectBlock.exit as string;
  for (const {
    consequence: consequenceSyntax,
    patterns: patternSyntaxMany,
  } of alternatives) {
    const consequenceBlock = match.getBlock(consequenceSyntax);
    const patternNode = builder.addNode(
      "CASE_CONDITION",
      `case ${patternSyntaxMany.map((pat) => pat.text).join(", ")}:`,
    );

    if (consequenceBlock?.entry)
      builder.addEdge(patternNode, consequenceBlock.entry, "consequence");
    if (consequenceBlock?.exit)
      builder.addEdge(consequenceBlock.exit, mergeNode, "regular");
    if (options.flatSwitch) {
      builder.addEdge(previous, patternNode, "regular");
    } else {
      if (previous) builder.addEdge(previous, patternNode, "alternative");
      previous = patternNode;
    }
  }

  return matcher.update({ entry: subjectBlock.entry, exit: mergeNode });
}

function processContinueStatement(
  _continueSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder } = ctx;
  const continueNode = builder.addNode("CONTINUE", "CONTINUE");
  return { entry: continueNode, exit: null, continues: [continueNode] };
}
function processBreakStatement(
  _breakSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder } = ctx;
  const breakNode = builder.addNode("BREAK", "BREAK");
  return { entry: breakNode, exit: null, breaks: [breakNode] };
}

function processIfStatement(
  ifNode: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder, matcher } = ctx;
  const match = matcher.match(
    ifNode,
    `
      (if_statement
          condition: (_) @if-cond
          consequence: (block) @then
          alternative: [
              (elif_clause 
                  condition: (_) @elif-cond
                  consequence: (block) @elif)
              (else_clause (block) @else)
                            ]*
      ) @if
      `,
  );

  const condSyntax = match.getSyntax("if-cond");
  const thenSyntax = match.getSyntax("then");
  const elifCondSyntaxMany = match.getSyntaxMany("elif-cond");
  const elifSyntaxMany = match.getSyntaxMany("elif");
  const elseSyntax = match.getSyntax("else");

  const condBlock = match.getBlock(condSyntax);
  const thenBlock = match.getBlock(thenSyntax);
  const elifCondBlocks = elifCondSyntaxMany.map((syntax) =>
    match.getBlock(syntax),
  );
  const elifBlocks = elifSyntaxMany.map((syntax) => match.getBlock(syntax));
  const elseBlock = match.getBlock(elseSyntax);

  const mergeNode = builder.addNode("MERGE", "if merge");
  const headNode = builder.addNode("CONDITION", "if condition");

  if (condBlock?.entry) builder.addEdge(headNode, condBlock.entry);

  const conds = [condBlock, ...elifCondBlocks];
  const consequences = [thenBlock, ...elifBlocks];
  let previous: null | BasicBlock = null;
  for (let i = 0; i < conds.length; ++i) {
    const conditionBlock = conds[i];
    const consequenceBlock = consequences[i];

    if (previous?.exit && conditionBlock?.entry)
      builder.addEdge(previous.exit, conditionBlock.entry, "alternative");
    if (conditionBlock?.exit && consequenceBlock?.entry)
      builder.addEdge(
        conditionBlock.exit,
        consequenceBlock.entry,
        "consequence",
      );
    if (consequenceBlock?.exit)
      builder.addEdge(consequenceBlock.exit, mergeNode);

    previous = conditionBlock;
  }
  if (elseBlock) {
    if (previous?.exit && elseBlock.entry)
      builder.addEdge(previous.exit, elseBlock.entry, "alternative");
    if (elseBlock.exit) builder.addEdge(elseBlock.exit, mergeNode);
  } else if (previous?.exit) {
    builder.addEdge(previous.exit, mergeNode, "alternative");
  }

  return matcher.update({ entry: headNode, exit: mergeNode });
}

function processForStatement(
  forNode: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder, matcher } = ctx;
  const match = matcher.match(
    forNode,
    `
      [(for_statement
          body: (_) @body
          alternative: (else_clause (block) @else)
      )
      (for_statement
          body: (_) @body
      )] @for
      `,
  );

  const bodySyntax = match.getSyntax("body");
  const elseSyntax = match.getSyntax("else");

  const bodyBlock = match.getBlock(bodySyntax);
  const elseBlock = match.getBlock(elseSyntax);

  const exitNode = builder.addNode("FOR_EXIT", "loop exit");
  const headNode = builder.addNode("LOOP_HEAD", "loop head");
  const headBlock = { entry: headNode, exit: headNode };

  /*
  head +-> body -> head
       --> else / exit
  break -> exit
  continue -> head
  */
  if (bodyBlock?.entry)
    builder.addEdge(headBlock.exit, bodyBlock.entry, "consequence");
  if (bodyBlock?.exit) builder.addEdge(bodyBlock.exit, headBlock.entry);
  if (elseBlock) {
    if (elseBlock.entry)
      builder.addEdge(headBlock.exit, elseBlock.entry, "alternative");
    if (elseBlock.exit) builder.addEdge(elseBlock.exit, exitNode);
  } else {
    builder.addEdge(headBlock.exit, exitNode, "alternative");
  }

  matcher.state.forEachContinue((continueNode) => {
    builder.addEdge(continueNode, headNode);
  });

  matcher.state.forEachBreak((breakNode) => {
    builder.addEdge(breakNode, exitNode);
  });

  return matcher.update({ entry: headNode, exit: exitNode });
}

function processWhileStatement(
  whileSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder, matcher } = ctx;
  const match = matcher.match(
    whileSyntax,
    `
    (while_statement
        condition: (_) @cond
        body: (_) @body
        alternative: (else_clause (_) @else)?
        ) @while
    `,
  );

  const condSyntax = match.getSyntax("cond");
  const bodySyntax = match.getSyntax("body");
  const elseSyntax = match.getSyntax("else");

  const condBlock = match.getBlock(condSyntax) as BasicBlock;
  const bodyBlock = match.getBlock(bodySyntax) as BasicBlock;
  const elseBlock = match.getBlock(elseSyntax);

  const exitNode = builder.addNode("FOR_EXIT", "loop exit");

  if (condBlock.exit) {
    if (bodyBlock.entry)
      builder.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
    builder.addEdge(
      condBlock.exit,
      elseBlock?.entry ?? exitNode,
      "alternative",
    );
  }
  if (elseBlock?.exit) builder.addEdge(elseBlock.exit, exitNode);

  if (condBlock.entry && bodyBlock.exit)
    builder.addEdge(bodyBlock.exit, condBlock.entry);

  matcher.state.forEachContinue((continueNode) => {
    if (condBlock.entry) builder.addEdge(continueNode, condBlock.entry);
  });

  matcher.state.forEachBreak((breakNode) => {
    builder.addEdge(breakNode, exitNode);
  });

  return matcher.update({ entry: condBlock.entry, exit: exitNode });
}

function processBlockStatement(
  blockSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  return ctx.dispatch.many(blockSyntax.namedChildren);
}
