import Parser from "web-tree-sitter";
import {
  type BasicBlock,
  type BuilderOptions,
  type CFGBuilder,
} from "./cfg-defs";
import {
  GenericCFGBuilder,
  type Context,
  type StatementHandlers,
} from "./generic-cfg-builder.ts";
import { matchExistsIn } from "./block-matcher.ts";
import { maybe, zip } from "./zip.ts";

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

export function createCFGBuilder(options: BuilderOptions): CFGBuilder {
  return new GenericCFGBuilder(statementHandlers, options);
}

function defaultProcessStatement(
  syntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder } = ctx;
  const hasYield = matchExistsIn(syntax, `(yield) @yield`);
  if (hasYield) {
    const yieldNode = builder.addNode("YIELD", syntax.text);
    ctx.link.syntaxToNode(syntax, yieldNode);
    return { entry: yieldNode, exit: yieldNode };
  }
  const newNode = builder.addNode("STATEMENT", syntax.text);
  ctx.link.syntaxToNode(syntax, newNode);
  return { entry: newNode, exit: newNode };
}
function processRaiseStatement(
  raiseSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder } = ctx;
  const raiseNode = builder.addNode("THROW", raiseSyntax.text);
  ctx.link.syntaxToNode(raiseSyntax, raiseNode);
  return { entry: raiseNode, exit: null };
}
function processReturnStatement(
  returnSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder } = ctx;
  const returnNode = builder.addNode("RETURN", returnSyntax.text);
  ctx.link.syntaxToNode(returnSyntax, returnNode);
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

  const bodySyntax = match.requireSyntax("try-body");
  const exceptSyntaxMany = match.getSyntaxMany("except-body");
  const elseSyntax = match.getSyntax("else-body");
  const finallySyntax = match.getSyntax("finally-body");

  const mergeNode = builder.addNode("MERGE", "merge try-complex");

  return builder.withCluster("try-complex", (tryComplexCluster) => {
    const bodyBlock = builder.withCluster("try", () =>
      match.getBlock(bodySyntax),
    );
    ctx.link.syntaxToNode(trySyntax, bodyBlock.entry);

    // We handle `except` blocks before the `finally` block to support `return` handling.
    const exceptBlocks = exceptSyntaxMany.map((exceptSyntax) =>
      builder.withCluster("except", () => match.getBlock(exceptSyntax)),
    );
    for (const [syntax, { entry }] of zip(
      match.getSyntaxMany("except"),
      exceptBlocks,
    )) {
      ctx.link.syntaxToNode(syntax, entry);
    }
    // We attach the except-blocks to the top of the `try` body.
    // In the rendering, we will connect them to the side of the node, and use invisible lines for it.
    if (bodyBlock.entry) {
      const headNode = bodyBlock.entry;
      exceptBlocks.forEach((exceptBlock) => {
        // Yes, this is effectively a head-to-head link. But that's ok.
        builder.addEdge(headNode, exceptBlock.entry, "exception");
      });
    }

    // Create the `else` block before `finally` to handle returns correctly.
    const elseBlock = match.getBlock(elseSyntax);
    if (elseBlock) {
      ctx.link.syntaxToNode(match.requireSyntax("else"), elseBlock.entry);
    }

    const finallyBlock = builder.withCluster("finally", () => {
      // Handle all the return statements from the try block
      if (finallySyntax) {
        // This is only relevant if there's a finally block.
        matcher.state.forEachReturn((returnNode) => {
          // We create a new finally block for each return node,
          // so that we can link them.
          const duplicateFinallyBlock = match.getBlock(finallySyntax);
          // We also clone the return node, to place it _after_ the finally block
          // We also override the cluster node, pulling it up to the `try-complex`,
          // as the return is neither in a `try`, `except`, or `finally` context.
          const returnNodeClone = builder.cloneNode(returnNode, {
            cluster: tryComplexCluster,
          });

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
    if (finallyBlock) {
      ctx.link.syntaxToNode(match.requireSyntax("finally"), finallyBlock.entry);
    }

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
        (":") @colon
          body: (block) @body
      ) @with
      `,
  );

  const withClauseSyntax = match.requireSyntax("with_clause");
  const withClauseBlock = match.getBlock(withClauseSyntax);
  return builder.withCluster("with", () => {
    const bodySyntax = match.requireSyntax("body");
    const bodyBlock = match.getBlock(bodySyntax);
    ctx.link.offsetToSyntax(match.requireSyntax("colon"), bodySyntax);

    if (withClauseBlock.exit)
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
  ctx.link.syntaxToNode(commentSyntax, commentNode);
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
            alternative: (case_clause (":") @case-colon)+  @case
          )
      ) @match
      `,
  );

  const subjectSyntax = match.requireSyntax("subject");

  const parseCase = (caseSyntax: Parser.SyntaxNode) => {
    const patterns = caseSyntax.children.filter(
      (c) => c.type === "case_pattern",
    ) as Parser.SyntaxNode[];
    const consequence = caseSyntax.childForFieldName(
      "consequence",
    ) as Parser.SyntaxNode;
    return { consequence, patterns };
  };

  const subjectBlock = match.getBlock(subjectSyntax);
  const mergeNode = builder.addNode("MERGE", "match merge");
  ctx.link.syntaxToNode(matchSyntax, subjectBlock.entry);

  // This is the case where case matches
  if (subjectBlock.exit)
    builder.addEdge(subjectBlock.exit, mergeNode, "alternative");

  let previous = subjectBlock.exit as string;
  for (const [caseSyntax, caseColon] of zip(
    match.getSyntaxMany("case"),
    match.getSyntaxMany("case-colon"),
  )) {
    const { consequence: consequenceSyntax, patterns: patternSyntaxMany } =
      parseCase(caseSyntax);
    const consequenceBlock = match.getBlock(consequenceSyntax);
    const patternNode = builder.addNode(
      "CASE_CONDITION",
      `case ${patternSyntaxMany.map((pat) => pat.text).join(", ")}:`,
    );
    patternSyntaxMany.forEach((syntax) =>
      ctx.link.syntaxToNode(syntax, patternNode),
    );
    ctx.link.offsetToSyntax(caseColon, consequenceSyntax);
    ctx.link.syntaxToNode(caseSyntax, patternNode);

    builder.addEdge(patternNode, consequenceBlock.entry, "consequence");
    if (consequenceBlock.exit)
      builder.addEdge(consequenceBlock.exit, mergeNode, "regular");
    if (options.flatSwitch) {
      builder.addEdge(previous, patternNode, "regular");
    } else {
      if (previous) builder.addEdge(previous, patternNode, "alternative");
      previous = patternNode;
    }
  }
  if (previous) builder.addEdge(previous, mergeNode, "alternative");

  return matcher.update({ entry: subjectBlock.entry, exit: mergeNode });
}

function processContinueStatement(
  continueSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder } = ctx;
  const continueNode = builder.addNode("CONTINUE", "CONTINUE");
  ctx.link.syntaxToNode(continueSyntax, continueNode);
  return { entry: continueNode, exit: null, continues: [continueNode] };
}
function processBreakStatement(
  breakSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder } = ctx;
  const breakNode = builder.addNode("BREAK", "BREAK");
  ctx.link.syntaxToNode(breakSyntax, breakNode);
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
          (":") @colon
          consequence: (block) @then
          alternative: [
              (elif_clause 
                  condition: (_) @elif-cond
                  (":") @elif-colon
                  consequence: (block) @elif) @elif-clause
              (else_clause 
                  (":") @else-colon
                  (block) @else
              ) @else-clause
                            ]*
      ) @if
      `,
  );

  const condSyntax = match.requireSyntax("if-cond");
  const thenSyntax = match.requireSyntax("then");
  const elifCondSyntaxMany = match.getSyntaxMany("elif-cond");
  const elifSyntaxMany = match.getSyntaxMany("elif");
  const elseSyntax = match.getSyntax("else");

  const condBlock = match.getBlock(condSyntax);
  const thenBlock = match.getBlock(thenSyntax);
  const elifCondBlocks = match.getManyBlocks(elifCondSyntaxMany);
  const elifBlocks = match.getManyBlocks(elifSyntaxMany);
  const elseBlock = match.getBlock(elseSyntax);

  for (const elifClause of maybe(match.getSyntax("elif-clause"))) {
    ctx.link.offsetToSyntax(thenSyntax, elifClause);
  }
  for (const [elifClause, elseClause] of zip(
    maybe(match.getLastSyntax("elif-clause") ?? thenSyntax),
    maybe(match.getSyntax("else-clause")),
  )) {
    ctx.link.offsetToSyntax(elifClause, elseClause);
  }
  ctx.link.offsetToSyntax(match.requireSyntax("colon"), thenSyntax);
  ctx.link.syntaxToNode(thenSyntax, thenBlock.entry);

  for (const [elifClauseSyntax, elifCondBlock] of zip(
    match.getSyntaxMany("elif-clause"),
    elifCondBlocks,
  )) {
    ctx.link.syntaxToNode(elifClauseSyntax, elifCondBlock.entry);
  }

  for (const [colonSyntax, elifSyntax] of zip(
    match.getSyntaxMany("elif-colon"),
    elifSyntaxMany,
  )) {
    ctx.link.offsetToSyntax(colonSyntax, elifSyntax);
  }
  if (elseSyntax)
    ctx.link.offsetToSyntax(match.requireSyntax("else-colon"), elseSyntax);

  const mergeNode = builder.addNode("MERGE", "if merge");
  const headNode = builder.addNode("CONDITION", "if condition");

  ctx.link.syntaxToNode(ifNode, headNode);

  builder.addEdge(headNode, condBlock.entry);

  const conds = [condBlock, ...elifCondBlocks];
  const consequences = [thenBlock, ...elifBlocks];
  let previous: null | BasicBlock = null;
  for (const [conditionBlock, consequenceBlock] of zip(conds, consequences)) {
    if (previous?.exit)
      builder.addEdge(previous.exit, conditionBlock.entry, "alternative");
    if (conditionBlock.exit)
      builder.addEdge(
        conditionBlock.exit,
        consequenceBlock.entry,
        "consequence",
      );
    if (consequenceBlock.exit)
      builder.addEdge(consequenceBlock.exit, mergeNode);

    previous = conditionBlock;
  }

  if (elseBlock) {
    ctx.link.syntaxToNode(match.requireSyntax("else-clause"), elseBlock.entry);
    if (previous?.exit)
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
          (":") @colon
          body: (_) @body
          alternative: (else_clause (block) @else)
      )
      (for_statement
          (":") @colon
          body: (_) @body
      )] @for
      `,
  );

  const bodySyntax = match.requireSyntax("body");
  const elseSyntax = match.getSyntax("else");

  const bodyBlock = match.getBlock(bodySyntax);
  const elseBlock = match.getBlock(elseSyntax);

  const exitNode = builder.addNode("FOR_EXIT", "loop exit");
  const headNode = builder.addNode("LOOP_HEAD", "loop head");
  const headBlock = { entry: headNode, exit: headNode };

  ctx.link.syntaxToNode(forNode, headNode);
  ctx.link.offsetToSyntax(match.requireSyntax("colon"), bodySyntax);

  /*
  head +-> body -> head
       --> else / exit
  break -> exit
  continue -> head
  */
  builder.addEdge(headBlock.exit, bodyBlock.entry, "consequence");
  if (bodyBlock.exit) builder.addEdge(bodyBlock.exit, headBlock.entry);
  if (elseBlock) {
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
        (":") @colon
        body: (_) @body
        alternative: (else_clause (_) @else)?
        ) @while
    `,
  );

  const condSyntax = match.requireSyntax("cond");
  const bodySyntax = match.requireSyntax("body");
  const elseSyntax = match.getSyntax("else");

  const condBlock = match.getBlock(condSyntax);
  const bodyBlock = match.getBlock(bodySyntax);
  const elseBlock = match.getBlock(elseSyntax);

  const exitNode = builder.addNode("FOR_EXIT", "loop exit");

  ctx.link.offsetToSyntax(match.requireSyntax("colon"), bodySyntax);

  if (condBlock.exit) {
    builder.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
    builder.addEdge(
      condBlock.exit,
      elseBlock?.entry ?? exitNode,
      "alternative",
    );
  }
  if (elseBlock?.exit) builder.addEdge(elseBlock.exit, exitNode);

  if (bodyBlock.exit) builder.addEdge(bodyBlock.exit, condBlock.entry);

  matcher.state.forEachContinue((continueNode) => {
    builder.addEdge(continueNode, condBlock.entry);
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
  return ctx.builder.withBlock(blockSyntax.id, () => {
    const blockBlock = ctx.dispatch.many(blockSyntax.namedChildren);
    ctx.link.syntaxToNode(blockSyntax, blockBlock.entry);
    return blockBlock;
  });
}
