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

interface Context {
  builder: Builder,
  options: BuilderOptions,
  matcher: BlockMatcher,
  processStatements(statements: Parser.SyntaxNode[]): BasicBlock,
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
  private readonly flatSwitch: boolean;
  private readonly markerPattern: RegExp | null;
  private readonly options: BuilderOptions;

  constructor(options: BuilderOptions) {
    this.options = options;
    this.flatSwitch = options.flatSwitch ?? false;
    this.markerPattern = options.markerPattern ?? null;
  }

  private buildContext(): Context {
    return {
      builder: this.builder, options: this.options, matcher: new BlockMatcher(this.processBlock.bind(this)),
      processStatements: this.processStatements.bind(this)
    }
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

  private processBlock(node: Parser.SyntaxNode | null): BasicBlock {
    if (!node) return { entry: null, exit: null };

    switch (node.type) {
      case "compound_statement":
        return this.processStatements(node.namedChildren);
      case "if_statement":
        return this.processIfStatement(node, new BlockMatcher(this.processBlock.bind(this)));
      case "for_statement":
        return this.processForStatement(node, new BlockMatcher(this.processBlock.bind(this)));
      case "while_statement":
        return this.processWhileStatement(node, new BlockMatcher(this.processBlock.bind(this)));
      case "do_statement":
        return this.processDoStatement(node, new BlockMatcher(this.processBlock.bind(this)));
      case "switch_statement":
        return processSwitchlike(node, this.buildContext());
      case "return_statement": {
        const returnNode = this.builder.addNode("RETURN", node.text);
        return { entry: returnNode, exit: null };
      }
      case "break_statement":
        return this.processBreakStatement(node);
      case "continue_statement":
        return this.processContinueStatement(node);
      case "labeled_statement":
        return this.processLabeledStatement(node);
      case "goto_statement":
        return this.processGotoStatement(node);
      case "comment":
        return this.processComment(node);
      default: {
        const newNode = this.builder.addNode("STATEMENT", node.text);
        return { entry: newNode, exit: newNode };
      }
    }
  }

  private processComment(commentSyntax: Parser.SyntaxNode): BasicBlock {
    // We only ever ger here when marker comments are enabled,
    // and only for marker comments as the rest are filtered out.
    const commentNode = this.builder.addNode(
      "MARKER_COMMENT",
      commentSyntax.text,
    );
    if (this.markerPattern) {
      const marker = commentSyntax.text.match(this.markerPattern)?.[1];
      if (marker) this.builder.addMarker(commentNode, marker);
    }
    return { entry: commentNode, exit: commentNode };
  }







  private processGotoStatement(gotoSyntax: Parser.SyntaxNode): BasicBlock {
    const name = gotoSyntax.firstNamedChild?.text as string;
    const gotoNode = this.builder.addNode("GOTO", name);
    return {
      entry: gotoNode,
      exit: null,
      gotos: [{ node: gotoNode, label: name }],
    };
  }

  private processLabeledStatement(labelSyntax: Parser.SyntaxNode): BasicBlock {
    const blockHandler = new BlockHandler();
    const name = getChildFieldText(labelSyntax, "label");
    const labelNode = this.builder.addNode("LABEL", name);
    const { entry: labeledEntry, exit: labeledExit } = blockHandler.update(
      this.processBlock(labelSyntax.namedChildren[1]),
    );
    if (labeledEntry) this.builder.addEdge(labelNode, labeledEntry);
    return blockHandler.update({
      entry: labelNode,
      exit: labeledExit,
      labels: new Map([[name, labelNode]]),
    });
  }

  private processContinueStatement(
    _continueSyntax: Parser.SyntaxNode,
  ): BasicBlock {
    const continueNode = this.builder.addNode("CONTINUE", "CONTINUE");
    return { entry: continueNode, exit: null, continues: [continueNode] };
  }

  private processBreakStatement(_breakSyntax: Parser.SyntaxNode): BasicBlock {
    const breakNode = this.builder.addNode("BREAK", "BREAK");
    return { entry: breakNode, exit: null, breaks: [breakNode] };
  }

  private processIfStatement(ifSyntax: Parser.SyntaxNode, matcher: BlockMatcher): BasicBlock {
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
      const match = matcher.tryMatch(currentSyntax, queryString);
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

    const headNode = this.builder.addNode("CONDITION", "if-else head");
    const mergeNode = this.builder.addNode("MERGE", "if-else merge");

    if (blocks[0].condBlock?.entry)
      this.builder.addEdge(headNode, blocks[0].condBlock.entry);

    let previous: string | null | undefined = null;
    for (const { condBlock, thenBlock } of blocks) {
      if (previous && condBlock?.entry) {
        this.builder.addEdge(previous, condBlock.entry, "alternative");
      }
      if (condBlock?.exit && thenBlock?.entry) {
        this.builder.addEdge(condBlock.exit, thenBlock.entry, "consequence");
      }
      if (thenBlock?.exit) {
        this.builder.addEdge(thenBlock.exit, mergeNode);
      }

      previous = condBlock?.exit;
    }

    function last<T>(items: T[]): T | undefined {
      return items[items.length - 1];
    }

    const elseBlock = last(blocks)?.elseBlock;
    if (elseBlock) {
      if (previous && elseBlock.entry) {
        this.builder.addEdge(previous, elseBlock.entry, "alternative");
      }
      if (elseBlock.exit) this.builder.addEdge(elseBlock.exit, mergeNode);
    } else if (previous) {
      this.builder.addEdge(previous, mergeNode, "alternative");
    }

    return matcher.update({ entry: headNode, exit: mergeNode });
  }

  private processForStatement(forNode: Parser.SyntaxNode, matcher: BlockMatcher): BasicBlock {
    const queryString = `
      (for_statement
	        initializer: (_)? @init
          condition: (_)? @cond
          update: (_)? @update
          body: (_) @body) @for
      `;
    const match = matcher.match(forNode, queryString);

    const initSyntax = match.getSyntax("init");
    const condSyntax = match.getSyntax("cond");
    const updateSyntax = match.getSyntax("update");
    const bodySyntax = match.getSyntax("body");

    const initBlock = match.getBlock(initSyntax);
    const condBlock = match.getBlock(condSyntax);
    const updateBlock = match.getBlock(updateSyntax);
    const bodyBlock = match.getBlock(bodySyntax);

    const entryNode = this.builder.addNode("EMPTY", "loop head");
    const exitNode = this.builder.addNode("FOR_EXIT", "loop exit");
    const headNode = this.builder.addNode("LOOP_HEAD", "loop head");
    const headBlock = { entry: headNode, exit: headNode };

    const chain = (entry: string | null, blocks: (BasicBlock | null)[]) => {
      let prevExit: string | null = entry;
      for (const block of blocks) {
        if (!block) continue;
        if (prevExit && block.entry)
          this.builder.addEdge(prevExit, block.entry);
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
          this.builder.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
        this.builder.addEdge(condBlock.exit, exitNode, "alternative");
        chain(bodyBlock?.exit ?? null, [headBlock, updateBlock, condBlock]);
      }
    } else {
      chain(topExit, [bodyBlock, headBlock, updateBlock, bodyBlock]);
    }

    matcher.state.forEachContinue((continueNode) => {
      this.builder.addEdge(continueNode, headNode);
    });

    matcher.state.forEachBreak((breakNode) => {
      this.builder.addEdge(breakNode, exitNode);
    });

    return matcher.update({ entry: entryNode, exit: exitNode });
  }

  private processWhileStatement(whileSyntax: Parser.SyntaxNode, matcher: BlockMatcher): BasicBlock {
    const queryString = `
    (while_statement
        condition: (_) @cond
        body: (_) @body
        ) @while
    `;
    const match = matcher.match(whileSyntax, queryString);

    const condSyntax = match.getSyntax("cond");
    const bodySyntax = match.getSyntax("body");

    const condBlock = match.getBlock(condSyntax) as BasicBlock;
    const bodyBlock = match.getBlock(bodySyntax) as BasicBlock;

    const exitNode = this.builder.addNode("FOR_EXIT", "loop exit");

    if (condBlock.exit) {
      if (bodyBlock.entry)
        this.builder.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
      this.builder.addEdge(condBlock.exit, exitNode, "alternative");
    }
    if (condBlock.entry && bodyBlock.exit)
      this.builder.addEdge(bodyBlock.exit, condBlock.entry);

    matcher.state.forEachContinue((continueNode) => {
      if (condBlock.entry) this.builder.addEdge(continueNode, condBlock.entry);
    });

    matcher.state.forEachBreak((breakNode) => {
      this.builder.addEdge(breakNode, exitNode);
    });

    return matcher.update({ entry: condBlock.entry, exit: exitNode });
  }

  private processDoStatement(whileSyntax: Parser.SyntaxNode, matcher: BlockMatcher): BasicBlock {
    const queryString = `
    (do_statement
        body: (_) @body
        condition: (_) @cond
        ) @while
    `;

    const match = matcher.match(whileSyntax, queryString);

    const condSyntax = match.getSyntax("cond");
    const bodySyntax = match.getSyntax("body");


    const condBlock = match.getBlock(condSyntax) as BasicBlock;
    const bodyBlock = match.getBlock(bodySyntax) as BasicBlock;

    const exitNode = this.builder.addNode("FOR_EXIT", "loop exit");

    if (condBlock.exit) {
      if (bodyBlock.entry)
        this.builder.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
      this.builder.addEdge(condBlock.exit, exitNode, "alternative");
    }
    if (condBlock.entry && bodyBlock.exit)
      this.builder.addEdge(bodyBlock.exit, condBlock.entry);

    matcher.state.forEachContinue((continueNode) => {
      if (condBlock.entry) this.builder.addEdge(continueNode, condBlock.entry);
    });

    matcher.state.forEachBreak((breakNode) => {
      this.builder.addEdge(breakNode, exitNode);
    });

    return matcher.update({ entry: bodyBlock.entry, exit: exitNode });
  }
}

function collectCases(
  switchSyntax: Parser.SyntaxNode,
  ctx: Context,
): Case[] {
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
        ctx.processStatements(consequence),
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

function processSwitchlike(switchSyntax: Parser.SyntaxNode, ctx: Context): BasicBlock {
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