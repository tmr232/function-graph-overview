import Parser from "web-tree-sitter";
import {
  type BasicBlock,
  type BuilderOptions,
  type CFGBuilder,
} from "./cfg-defs";
import { Match } from "./block-matcher.ts";
import {
  GenericCFGBuilder,
  type Context,
  type StatementHandlers,
} from "./generic-cfg-builder.ts";
import { pairwise, zip } from "./zip.ts";
import { buildSwitch, collectCases } from "./switch-utils.ts";

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

export function createCFGBuilder(options: BuilderOptions): CFGBuilder {
  return new GenericCFGBuilder(statementHandlers, options);
}

function processForStatement(
  forNode: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const queryString = `
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
    `;
  const match = ctx.matcher.match(forNode, queryString);

  const initSyntax = match.getSyntax("init");
  const condSyntax = match.getSyntax("cond");
  const updateSyntax = match.getSyntax("update");
  const bodySyntax = match.requireSyntax("body");

  const initBlock = match.getBlock(initSyntax);
  const condBlock = match.getBlock(condSyntax);
  const updateBlock = match.getBlock(updateSyntax);
  const bodyBlock = match.getBlock(bodySyntax);

  const entryNode = ctx.builder.addNode("EMPTY", "loop head");
  const exitNode = ctx.builder.addNode("FOR_EXIT", "loop exit");
  const headNode = ctx.builder.addNode("LOOP_HEAD", "loop head");
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

  const chainBlocks = (entry: string | null, blocks: (BasicBlock | null)[]) => {
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
      chainBlocks(bodyBlock.exit ?? null, [headBlock, updateBlock, condBlock]);
    }
  } else {
    chainBlocks(topExit, [bodyBlock, headBlock, updateBlock, bodyBlock]);
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
        condition: (_ ")" @closing-paren) @cond
        consequence: (_ "}"? @closing-brace) @then
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
      prevIf.requireSyntax("closing-brace"),
      thisIf.requireSyntax("if"),
    );
  }

  const headNode = ctx.builder.addNode("CONDITION", "if-else head");
  const mergeNode = ctx.builder.addNode("MERGE", "if-else merge");

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

  function last<T>(items: T[]): T | undefined {
    return items[items.length - 1];
  }

  const elseBlock = last(blocks)?.elseBlock;
  if (elseBlock) {
    const lastMatch = last(allIfs) as Match;
    const elseSyntax = lastMatch.requireSyntax("else");
    ctx.link.syntaxToNode(elseSyntax, elseBlock.entry);
    ctx.link.offsetToSyntax(
      lastMatch.requireSyntax("closing-brace"),
      elseSyntax,
    );

    if (previous && elseBlock.entry) {
      ctx.builder.addEdge(previous, elseBlock.entry, "alternative");
    }
    if (elseBlock.exit) ctx.builder.addEdge(elseBlock.exit, mergeNode);
  } else if (previous) {
    ctx.builder.addEdge(previous, mergeNode, "alternative");
  }
  return ctx.state.update({ entry: headNode, exit: mergeNode });
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

  const condSyntax = match.requireSyntax("cond");
  const bodySyntax = match.requireSyntax("body");

  const condBlock = match.getBlock(condSyntax);
  const bodyBlock = match.getBlock(bodySyntax);

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

  ctx.link.syntaxToNode(bodySyntax, bodyBlock.entry);
  ctx.link.syntaxToNode(condSyntax, condBlock.entry);
  ctx.link.syntaxToNode(whileSyntax, condBlock.entry);

  return ctx.matcher.update({ entry: condBlock.entry, exit: exitNode });
}

function processDoStatement(
  doSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
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

  ctx.link.syntaxToNode(bodySyntax, bodyBlock.entry);
  ctx.link.syntaxToNode(condSyntax, condBlock.entry);
  ctx.link.syntaxToNode(doSyntax, bodyBlock.entry);

  return ctx.matcher.update({ entry: bodyBlock.entry, exit: exitNode });
}

function processGotoStatement(
  gotoSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const name = gotoSyntax.firstNamedChild?.text as string;
  const gotoNode = ctx.builder.addNode("GOTO", name);
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
  const labelNode = ctx.builder.addNode("LABEL", name);
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
  } else {
    // C allows for empty labels.
    return ctx.state.update({
      entry: labelNode,
      exit: labelNode,
      labels: new Map([[name, labelNode]]),
    });
  }
}

function processContinueStatement(
  continueSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const continueNode = ctx.builder.addNode("CONTINUE", "CONTINUE");
  ctx.link.syntaxToNode(continueSyntax, continueNode);
  return { entry: continueNode, exit: null, continues: [continueNode] };
}

function processBreakStatement(
  breakSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const breakNode = ctx.builder.addNode("BREAK", "BREAK");
  ctx.link.syntaxToNode(breakSyntax, breakNode);
  return { entry: breakNode, exit: null, breaks: [breakNode] };
}

function processComment(
  commentSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  // We only ever ger here when marker comments are enabled,
  // and only for marker comments as the rest are filtered out.
  const commentNode = ctx.builder.addNode("MARKER_COMMENT", commentSyntax.text);
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
  return ctx.builder.withBlock(syntax.id, () => {
    const blockBlock = ctx.dispatch.many(syntax.namedChildren);
    ctx.link.syntaxToNode(syntax, blockBlock.entry);
    return blockBlock;
  });
}

function processReturnStatement(
  syntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const returnNode = ctx.builder.addNode("RETURN", syntax.text);
  ctx.link.syntaxToNode(syntax, returnNode);
  return { entry: returnNode, exit: null };
}

function defaultProcessStatement(
  syntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const newNode = ctx.builder.addNode("STATEMENT", syntax.text);
  ctx.link.syntaxToNode(syntax, newNode);
  return { entry: newNode, exit: newNode };
}

const caseTypes = ["case_statement"];

function getCases(switchSyntax: Parser.SyntaxNode): Parser.SyntaxNode[] {
  const switchBody = switchSyntax.namedChildren[1] as Parser.SyntaxNode;
  return switchBody.namedChildren.filter((child) =>
    caseTypes.includes(child.type),
  );
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
  );
  ctx.link.syntaxToNode(switchSyntax, headNode);
  const mergeNode: string = ctx.builder.addNode("SWITCH_MERGE", "");
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
