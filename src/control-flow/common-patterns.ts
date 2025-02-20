import type Parser from "web-tree-sitter";
import type { Match } from "./block-matcher.ts";
import type { BasicBlock } from "./cfg-defs.ts";
import type { Context } from "./generic-cfg-builder.ts";
import { last, pairwise, zip } from "./itertools.ts";

export function cStyleIfProcessor(
  queryString: string,
): (ifSyntax: Parser.SyntaxNode, ctx: Context) => BasicBlock {
  return (ifSyntax: Parser.SyntaxNode, ctx: Context): BasicBlock => {
    const getIfs = (currentSyntax: Parser.SyntaxNode): Match[] => {
      const match = ctx.matcher.tryMatch(currentSyntax, queryString);
      if (!match) return [];
      const elseifSyntax = match.getSyntax("else-if");
      if (!elseifSyntax) return [match];
      return [match, ...getIfs(elseifSyntax)];
    };
    const allIfs = getIfs(ifSyntax);
    const blocks = allIfs.map((ifMatch) => ({
      condBlock: ifMatch.getBlock(ifMatch.requireSyntax("cond")),
      thenBlock: ifMatch.getBlock(ifMatch.requireSyntax("then")),
      elseBlock: ifMatch.getBlock(ifMatch.getSyntax("else-body")),
    }));

    for (const [ifMatch, { condBlock }] of zip(allIfs, blocks)) {
      ctx.link.syntaxToNode(ifMatch.requireSyntax("if"), condBlock.entry);
      ctx.link.offsetToSyntax(
        ifMatch.requireSyntax("closing-paren"),
        ifMatch.requireSyntax("then"),
      );
    }
    for (const [prevIf, thisIf] of pairwise(allIfs)) {
      ctx.link.offsetToSyntax(
        prevIf.requireSyntax("then"),
        thisIf.requireSyntax("if"),
      );
    }

    const headNode = ctx.builder.addNode(
      "CONDITION",
      "if-else head",
      ifSyntax.startIndex,
    );
    const mergeNode = ctx.builder.addNode(
      "MERGE",
      "if-else merge",
      ifSyntax.endIndex,
    );

    // An ugly hack to make tsc not hate us.
    const firstBlock = blocks[0];
    if (firstBlock?.condBlock.entry)
      ctx.builder.addEdge(headNode, firstBlock.condBlock.entry);

    let previous: string | null | undefined = null;
    for (const { condBlock, thenBlock } of blocks) {
      if (previous && condBlock.entry) {
        ctx.builder.addEdge(previous, condBlock.entry, "alternative");
      }
      if (condBlock.exit && thenBlock.entry) {
        ctx.builder.addEdge(condBlock.exit, thenBlock.entry, "consequence");
      }
      if (thenBlock.exit) {
        ctx.builder.addEdge(thenBlock.exit, mergeNode);
      }

      previous = condBlock.exit;
    }

    const elseBlock = last(blocks)?.elseBlock;
    if (elseBlock) {
      const lastMatch = last(allIfs) as Match;
      const elseSyntax = lastMatch.requireSyntax("else");
      ctx.link.syntaxToNode(elseSyntax, elseBlock.entry);
      ctx.link.offsetToSyntax(lastMatch.requireSyntax("then"), elseSyntax);

      if (previous && elseBlock.entry) {
        ctx.builder.addEdge(previous, elseBlock.entry, "alternative");
      }
      if (elseBlock.exit) ctx.builder.addEdge(elseBlock.exit, mergeNode);
    } else if (previous) {
      ctx.builder.addEdge(previous, mergeNode, "alternative");
    }
    return ctx.state.update({ entry: headNode, exit: mergeNode });
  };
}

export type rangeForDefinition = {
  /**
   * The query string to use
   */
  query: string;
  /**
   * The name of the loop-body capture
   */
  body: string;
  /**
   * Name of the else-body capture, if exists
   */
  else?: string;
  /**
   * Name of the capture of the last character in the loop header.
   * This is `:` in Python, and `)` in C++ and TypeScript.
   */
  headerEnd: string;
};

/**
 * Processor template for for-each loops.
 * This differs from classic C-style loops, especially in that we can't
 * trivialize the loop.
 * @param definition
 */
export function forEachLoopProcessor(
  definition: rangeForDefinition,
): (forNode: Parser.SyntaxNode, ctx: Context) => BasicBlock {
  return (forNode: Parser.SyntaxNode, ctx: Context): BasicBlock => {
    const { builder, matcher } = ctx;
    const match = matcher.match(forNode, definition.query);

    const bodySyntax = match.requireSyntax(definition.body);
    const elseSyntax = definition.else
      ? match.getSyntax(definition.else)
      : undefined;

    const bodyBlock = match.getBlock(bodySyntax);
    const elseBlock = match.getBlock(elseSyntax);

    const headNode = builder.addNode(
      "LOOP_HEAD",
      "loop head",
      forNode.startIndex,
    );
    const exitNode = builder.addNode("FOR_EXIT", "loop exit", forNode.endIndex);
    const headBlock = { entry: headNode, exit: headNode };

    ctx.link.syntaxToNode(forNode, headNode);
    ctx.link.offsetToSyntax(
      match.requireSyntax(definition.headerEnd),
      bodySyntax,
    );

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
    }, ctx.extra?.label);

    matcher.state.forEachBreak((breakNode) => {
      builder.addEdge(breakNode, exitNode);
    }, ctx.extra?.label);

    return matcher.update({ entry: headNode, exit: exitNode });
  };
}

export function cStyleForStatementProcessor(
  queryString: string,
): (forNode: Parser.SyntaxNode, ctx: Context) => BasicBlock {
  return (forNode: Parser.SyntaxNode, ctx: Context): BasicBlock => {
    const match = ctx.matcher.match(forNode, queryString);

    const initSyntax = match.getSyntax("init");
    const condSyntax = match.getSyntax("cond");
    const updateSyntax = match.getSyntax("update");
    const bodySyntax = match.requireSyntax("body");

    const initBlock = match.getBlock(initSyntax);
    const condBlock = match.getBlock(condSyntax);
    const updateBlock = match.getBlock(updateSyntax);
    const bodyBlock = match.getBlock(bodySyntax);

    const entryNode = ctx.builder.addNode(
      "EMPTY",
      "loop head",
      forNode.startIndex,
    );
    const exitNode = ctx.builder.addNode(
      "FOR_EXIT",
      "loop exit",
      forNode.endIndex,
    );
    const headNode = ctx.builder.addNode(
      "LOOP_HEAD",
      "loop head",
      forNode.startIndex,
    );
    const headBlock = { entry: headNode, exit: headNode };

    ctx.link.syntaxToNode(forNode, entryNode);
    if (condBlock) {
      ctx.link.syntaxToNode(match.requireSyntax("cond-semi"), condBlock.entry);
    }

    const closeParens = match.requireSyntax("close-parens");

    if (initSyntax)
      ctx.link.offsetToSyntax(initSyntax, match.requireSyntax("init-semi"), {
        reverse: true,
        includeTo: true,
      });
    if (condSyntax)
      ctx.link.offsetToSyntax(condSyntax, match.requireSyntax("cond-semi"), {
        reverse: true,
        includeTo: true,
      });
    if (!condSyntax && initSyntax)
      ctx.link.offsetToSyntax(initSyntax, match.requireSyntax("cond-semi"), {
        includeTo: true,
        reverse: true,
      });
    if (updateSyntax)
      ctx.link.offsetToSyntax(updateSyntax, closeParens, {
        reverse: true,
        includeTo: true,
      });
    if (condSyntax && !updateSyntax)
      ctx.link.offsetToSyntax(condSyntax, closeParens, {
        reverse: true,
        includeTo: true,
      });
    ctx.link.offsetToSyntax(closeParens, bodySyntax);

    const chainBlocks = (
      entry: string | null,
      blocks: (BasicBlock | null)[],
    ) => {
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
    const topExit = chainBlocks(entryNode, [initBlock]);
    if (condBlock) {
      chainBlocks(topExit, [condBlock]);
      if (condBlock.exit) {
        ctx.builder.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
        ctx.builder.addEdge(condBlock.exit, exitNode, "alternative");
        chainBlocks(bodyBlock.exit ?? null, [
          headBlock,
          updateBlock,
          condBlock,
        ]);
      }
    } else {
      chainBlocks(topExit, [bodyBlock, headBlock, updateBlock, bodyBlock]);
    }

    ctx.matcher.state.forEachContinue((continueNode) => {
      ctx.builder.addEdge(continueNode, headNode);
    }, ctx.extra?.label);

    ctx.matcher.state.forEachBreak((breakNode) => {
      ctx.builder.addEdge(breakNode, exitNode);
    }, ctx.extra?.label);

    return ctx.matcher.update({ entry: entryNode, exit: exitNode });
  };
}

export function cStyleWhileProcessor(): (
  whileSyntax: Parser.SyntaxNode,
  ctx: Context,
) => BasicBlock {
  return (whileSyntax: Parser.SyntaxNode, ctx: Context): BasicBlock => {
    const queryString = `
  (while_statement
      condition: (_) @cond
      body: (_) @body
      ) @while
  `;
    const match = ctx.matcher.match(whileSyntax, queryString);

    const condSyntax = match.requireSyntax("cond");
    const bodySyntax = match.requireSyntax("body");

    const condBlock = match.getBlock(condSyntax);
    const bodyBlock = match.getBlock(bodySyntax);

    const exitNode = ctx.builder.addNode(
      "FOR_EXIT",
      "loop exit",
      whileSyntax.endIndex,
    );

    if (condBlock.exit) {
      if (bodyBlock.entry)
        ctx.builder.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
      ctx.builder.addEdge(condBlock.exit, exitNode, "alternative");
    }
    if (condBlock.entry && bodyBlock.exit)
      ctx.builder.addEdge(bodyBlock.exit, condBlock.entry);

    ctx.matcher.state.forEachContinue((continueNode) => {
      if (condBlock.entry) ctx.builder.addEdge(continueNode, condBlock.entry);
    }, ctx.extra?.label);

    ctx.matcher.state.forEachBreak((breakNode) => {
      ctx.builder.addEdge(breakNode, exitNode);
    }, ctx.extra?.label);

    ctx.link.syntaxToNode(bodySyntax, bodyBlock.entry);
    ctx.link.syntaxToNode(condSyntax, condBlock.entry);
    ctx.link.syntaxToNode(whileSyntax, condBlock.entry);

    return ctx.matcher.update({ entry: condBlock.entry, exit: exitNode });
  };
}

export function cStyleDoWhileProcessor(): (
  doSyntax: Parser.SyntaxNode,
  ctx: Context,
) => BasicBlock {
  return (doSyntax: Parser.SyntaxNode, ctx: Context): BasicBlock => {
    const queryString = `
  (do_statement
      body: (_) @body
      condition: (_) @cond
      ) @do
  `;

    const match = ctx.matcher.match(doSyntax, queryString);

    const condSyntax = match.requireSyntax("cond");
    const bodySyntax = match.requireSyntax("body");

    const condBlock = match.getBlock(condSyntax);
    const bodyBlock = match.getBlock(bodySyntax);

    const exitNode = ctx.builder.addNode(
      "FOR_EXIT",
      "loop exit",
      doSyntax.endIndex,
    );

    if (condBlock.exit) {
      if (bodyBlock.entry)
        ctx.builder.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
      ctx.builder.addEdge(condBlock.exit, exitNode, "alternative");
    }
    if (condBlock.entry && bodyBlock.exit)
      ctx.builder.addEdge(bodyBlock.exit, condBlock.entry);

    ctx.matcher.state.forEachContinue((continueNode) => {
      if (condBlock.entry) ctx.builder.addEdge(continueNode, condBlock.entry);
    }, ctx.extra?.label);

    ctx.matcher.state.forEachBreak((breakNode) => {
      ctx.builder.addEdge(breakNode, exitNode);
    }, ctx.extra?.label);

    ctx.link.syntaxToNode(bodySyntax, bodyBlock.entry);
    ctx.link.syntaxToNode(condSyntax, condBlock.entry);
    ctx.link.syntaxToNode(doSyntax, bodyBlock.entry);

    return ctx.matcher.update({ entry: bodyBlock.entry, exit: exitNode });
  };
}

export function getChildFieldText(
  node: Parser.SyntaxNode,
  fieldName: string,
): string {
  const child = node.childForFieldName(fieldName);
  return child ? child.text : "";
}

export function processGotoStatement(
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

export function processLabeledStatement(
  labelSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const name = getChildFieldText(labelSyntax, "label");
  const labelNode = ctx.builder.addNode("LABEL", name, labelSyntax.startIndex);
  ctx.link.syntaxToNode(labelSyntax, labelNode);
  const labelContentSyntax = labelSyntax.namedChildren[1];
  if (labelContentSyntax) {
    const { entry: labeledEntry, exit: labeledExit } = ctx.state.update(
      ctx.dispatch.single(labelContentSyntax, { label: name }),
    );
    if (labeledEntry) ctx.builder.addEdge(labelNode, labeledEntry);
    return ctx.state.update({
      entry: labelNode,
      exit: labeledExit,
      labels: new Map([[name, labelNode]]),
    });
  }
  // Go allows for empty labels.
  return ctx.state.update({
    entry: labelNode,
    exit: labelNode,
    labels: new Map([[name, labelNode]]),
  });
}

export function processContinueStatement(
  continueSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const continueNode = ctx.builder.addNode(
    "CONTINUE",
    "CONTINUE",
    continueSyntax.startIndex,
  );
  ctx.link.syntaxToNode(continueSyntax, continueNode);
  return {
    entry: continueNode,
    exit: null,
    continues: [{ from: continueNode }],
  };
}

export function processBreakStatement(
  breakSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const breakNode = ctx.builder.addNode(
    "BREAK",
    "BREAK",
    breakSyntax.startIndex,
  );
  ctx.link.syntaxToNode(breakSyntax, breakNode);
  return { entry: breakNode, exit: null, breaks: [{ from: breakNode }] };
}

export function labeledContinueProcessor(
  queryString: string,
): (continueSyntax: Parser.SyntaxNode, ctx: Context) => BasicBlock {
  return (continueSyntax: Parser.SyntaxNode, ctx: Context): BasicBlock => {
    const match = ctx.matcher.match(continueSyntax, queryString);
    const labelSyntax = match.getSyntax("label");
    const label = labelSyntax?.text;
    const continueNode = ctx.builder.addNode(
      "CONTINUE",
      "CONTINUE",
      continueSyntax.startIndex,
    );
    ctx.link.syntaxToNode(continueSyntax, continueNode);
    return {
      entry: continueNode,
      exit: null,
      continues: [{ from: continueNode, label }],
    };
  };
}

export function labeledBreakProcessor(
  queryString: string,
): (breakSyntax: Parser.SyntaxNode, ctx: Context) => BasicBlock {
  return (breakSyntax: Parser.SyntaxNode, ctx: Context): BasicBlock => {
    const match = ctx.matcher.match(breakSyntax, queryString);
    const labelSyntax = match.getSyntax("label");
    const label = labelSyntax?.text;
    const breakNode = ctx.builder.addNode(
      "BREAK",
      "BREAK",
      breakSyntax.startIndex,
    );
    ctx.link.syntaxToNode(breakSyntax, breakNode);
    return {
      entry: breakNode,
      exit: null,
      breaks: [{ from: breakNode, label }],
    };
  };
}

export function processStatementSequence(
  syntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const blockBlock = ctx.dispatch.many(syntax.namedChildren, syntax);
  ctx.link.syntaxToNode(syntax, blockBlock.entry);
  return blockBlock;
}

export function processReturnStatement(
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

export function processComment(
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

export function processThrowStatement(
  throwSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder } = ctx;
  const throwNode = builder.addNode(
    "THROW",
    throwSyntax.text,
    throwSyntax.startIndex,
  );
  ctx.link.syntaxToNode(throwSyntax, throwNode);
  return { entry: throwNode, exit: null };
}
