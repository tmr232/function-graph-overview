import { MultiDirectedGraph } from "graphology";
import Parser from "web-tree-sitter";
import {
  BlockHandler,
  type BasicBlock,
  type BuilderOptions,
  type CFG,
  type CFGGraph,
  type Cluster,
  type ClusterId,
  type ClusterType,
  type EdgeType,
  type GraphEdge,
  type GraphNode,
  type NodeType,
} from "./cfg-defs";


class Builder {
  private graph: CFGGraph;
  private nodeId: number = 0;
  private clusterId: ClusterId = 0;
  private activeClusters: Cluster[] = [];

  constructor(graph: CFGGraph) {
    this.graph = graph;
  }

  private startCluster(type: ClusterType): Cluster {
    const parent =
      this.activeClusters.length === 0
        ? undefined
        : this.activeClusters[this.activeClusters.length - 1];
    const cluster = {
      id: this.clusterId++,
      type,
      parent,
      depth: this.activeClusters.length + 1,
    };
    this.activeClusters.push(cluster);
    return cluster;
  }
  private endCluster(_cluster: Cluster) {
    // We assume that all clusters form a stack.
    this.activeClusters.pop();
  }

  public withCluster<T>(type: ClusterType, fn: (cluster: Cluster) => T): T {
    const cluster = this.startCluster(type);
    try {
      return fn(cluster);
    } finally {
      this.endCluster(cluster);
    }
  }
  public addNode(type: NodeType, code: string, lines: number = 1): string {
    const id = `node${this.nodeId++}`;
    const cluster = this.activeClusters[this.activeClusters.length - 1];
    this.graph.addNode(id, {
      type,
      code,
      lines,
      markers: [],
      cluster,
    });
    return id;
  }

  public cloneNode(node: string, overrides?: { cluster: Cluster }): string {
    const id = `node${this.nodeId++}`;
    const originalAttrs = this.graph.getNodeAttributes(node);
    const nodeAttrs = structuredClone(originalAttrs);
    nodeAttrs.cluster = originalAttrs.cluster;
    Object.assign(nodeAttrs, overrides);
    this.graph.addNode(id, nodeAttrs);
    return id;
  }

  public addMarker(node: string, marker: string) {
    this.graph.getNodeAttributes(node).markers.push(marker);
  }

  public addEdge(
    source: string,
    target: string,
    type: EdgeType = "regular",
  ): void {
    if (!this.graph.hasEdge(source, target)) {
      this.graph.addEdge(source, target, { type });
    }
  }
}

function matchQuery(
  syntax: Parser.SyntaxNode,
  mainName: string,
  queryString: string,
) {
  const language = syntax.tree.getLanguage();
  const query = language.query(queryString);
  const matches = query.matches(syntax);
  const match = (() => {
    for (const match of matches) {
      for (const capture of match.captures) {
        if (capture.name === mainName && capture.node.id === syntax.id) {
          return match;
        }
      }
    }
    throw new Error("No match found!");
  })();
  return match;
}

function matchExistsIn(
  syntax: Parser.SyntaxNode,
  mainName: string,
  queryString: string,
): boolean {
  const language = syntax.tree.getLanguage();
  const query = language.query(queryString);
  const matches = query.matches(syntax);
  return matches.length > 0;
}

function getSyntax(
  match: Parser.QueryMatch,
  name: string,
): Parser.SyntaxNode | undefined {
  return getSyntaxMany(match, name)[0];
}


function getSyntaxMany(
  match: Parser.QueryMatch,
  name: string,
): Parser.SyntaxNode[] {
  return match.captures
    .filter((capture) => capture.name === name)
    .map((capture) => capture.node);
}

class BlockMatcher {
  private blockHandler: BlockHandler = new BlockHandler();
  private processBlock: (syntax: Parser.SyntaxNode | null) => BasicBlock;
  public update = this.blockHandler.update.bind(this.blockHandler);
  private match: Parser.QueryMatch;

  constructor(processBlock: BlockMatcher["processBlock"], syntax: Parser.SyntaxNode, mainName: string, query: string) {
    this.processBlock = processBlock;
    this.match = matchQuery(syntax, mainName, query);
  }

  public getSyntax(name: string): ReturnType<typeof getSyntax> {
    return getSyntax(this.match, name);
  }

  public getSyntaxMany(name: string): ReturnType<typeof getSyntaxMany> {
    return getSyntaxMany(this.match, name);
  }

  public getBlock(syntax: Parser.SyntaxNode | null | undefined) {
    return syntax ? this.blockHandler.update(this.processBlock(syntax)) : null;
  }
}

export class CFGBuilder {
  private graph: MultiDirectedGraph<GraphNode, GraphEdge> =
    new MultiDirectedGraph();
  private builder: Builder = new Builder(this.graph);
  private readonly flatSwitch: boolean;
  private readonly markerPattern: RegExp | null;

  constructor(options?: BuilderOptions) {
    this.flatSwitch = options?.flatSwitch ?? false;
    this.markerPattern = options?.markerPattern ?? null;
  }

  public buildCFG(functionNode: Parser.SyntaxNode): CFG {
    const startNode = this.builder.addNode("START", "START");
    const bodyNode = functionNode.childForFieldName("body");
    if (bodyNode) {
      const blockHandler = new BlockHandler();
      const { entry, exit } = blockHandler.update(
        this.processStatements(bodyNode.namedChildren, this.builder),
      );

      const endNode = this.builder.addNode("RETURN", "implicit return");
      // `entry` will be non-null for any valid code
      if (entry) this.builder.addEdge(startNode, entry);
      if (exit) this.builder.addEdge(exit, endNode);
    }
    return { graph: this.graph, entry: startNode };
  }

  private processStatements(
    statements: Parser.SyntaxNode[],
    builder: Builder,
  ): BasicBlock {
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
      const emptyNode = builder.addNode("EMPTY", "empty block");
      return { entry: emptyNode, exit: emptyNode };
    }

    let entry: string | null = null;
    let previous: string | null = null;
    for (const statement of codeStatements) {
      const { entry: currentEntry, exit: currentExit } = blockHandler.update(
        this.processBlock(statement),
      );
      if (!entry) entry = currentEntry;
      if (previous && currentEntry) builder.addEdge(previous, currentEntry);
      previous = currentExit;
    }
    return blockHandler.update({ entry, exit: previous });
  }

  private processBlock(syntax: Parser.SyntaxNode | null): BasicBlock {
    if (!syntax) return { entry: null, exit: null };

    switch (syntax.type) {
      case "block":
        return this.processStatements(syntax.namedChildren, this.builder);
      case "if_statement":
        return this.processIfStatement(syntax, this.builder);
      case "for_statement":
        return this.processForStatement(syntax, this.builder);
      case "while_statement":
        return this.processWhileStatement(syntax, this.builder);
      case "match_statement":
        return this.processMatchStatement(syntax, this.builder);
      case "return_statement":
        return this.processReturnStatement(syntax, this.builder);
      case "break_statement":
        return this.processBreakStatement(syntax, this.builder);
      case "continue_statement":
        return this.processContinueStatement(syntax, this.builder);
      case "comment":
        return this.processComment(syntax, this.builder);
      case "with_statement":
        return this.processWithStatement(syntax, this.builder);
      case "try_statement":
        return this.processTryStatement(syntax, this.builder);
      case "raise_statement":
        return this.processRaiseStatement(syntax, this.builder);
      default:
        return this.defaultProcessStatement(syntax, this.builder);
    }
  }
  private defaultProcessStatement(
    syntax: Parser.SyntaxNode,
    builder: Builder,
  ): BasicBlock {
    const hasYield = this.matchExistsIn(syntax, "yield", `(yield) @yield`);
    if (hasYield) {
      const yieldNode = builder.addNode("YIELD", syntax.text);
      return { entry: yieldNode, exit: yieldNode };
    }
    const newNode = builder.addNode("STATEMENT", syntax.text);
    return { entry: newNode, exit: newNode };
  }
  private processRaiseStatement(
    raiseSyntax: Parser.SyntaxNode,
    builder: Builder,
  ): BasicBlock {
    const raiseNode = builder.addNode("THROW", raiseSyntax.text);
    return { entry: raiseNode, exit: null };
  }
  private processReturnStatement(
    returnSyntax: Parser.SyntaxNode,
    builder: Builder,
  ): BasicBlock {
    const returnNode = builder.addNode("RETURN", returnSyntax.text);
    return { entry: returnNode, exit: null, returns: [returnNode] };
  }
  private processTryStatement(
    trySyntax: Parser.SyntaxNode,
    builder: Builder,
  ): BasicBlock {
    /*
    Here's an idea - I can duplicate the finally blocks!
    Then if there's a return, I stick the finally before it.
    In other cases, the finally is after the end of the try-body.
    This is probably the best course of action.
    */
    const blockHandler = new BlockHandler();
    const match = this.matchQuery(
      trySyntax,
      "try",
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

    const getBlock = this.blockGetter(blockHandler);

    const bodySyntax = this.getSyntax(match, "try-body");
    const exceptSyntaxMany = this.getSyntaxMany(match, "except-body");
    const elseSyntax = this.getSyntax(match, "else-body");
    const finallySyntax = this.getSyntax(match, "finally-body");

    const mergeNode = builder.addNode("MERGE", "merge try-complex");

    return builder.withCluster("try-complex", (tryComplexCluster) => {
      const bodyBlock = builder.withCluster("try", () =>
        getBlock(bodySyntax),
      ) as BasicBlock;

      // We handle `except` blocks before the `finally` block to support `return` handling.
      const exceptBlocks = exceptSyntaxMany.map((exceptSyntax) =>
        builder.withCluster(
          "except",
          () => getBlock(exceptSyntax) as BasicBlock,
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
      const elseBlock = getBlock(elseSyntax);

      const finallyBlock = builder.withCluster("finally", () => {
        // Handle all the return statements from the try block
        if (finallySyntax) {
          // This is only relevant if there's a finally block.
          blockHandler.forEachReturn((returnNode) => {
            // We create a new finally block for each return node,
            // so that we can link them.
            const duplicateFinallyBlock = getBlock(finallySyntax) as BasicBlock;
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
        const finallyBlock = getBlock(finallySyntax);
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

      return blockHandler.update({
        entry: bodyBlock.entry,
        exit: mergeNode,
      });
    });
  }
  private processWithStatement(
    withSyntax: Parser.SyntaxNode,
    builder: Builder,
  ): BasicBlock {
    const blockHandler = new BlockHandler();
    const match = this.matchQuery(
      withSyntax,
      "with",
      `
      (with_statement
        (with_clause) @with_clause
          body: (block) @body
      ) @with
      `,
    );
    const getBlock = this.blockGetter(blockHandler);

    const withClauseSyntax = this.getSyntax(match, "with_clause");
    const withClauseBlock = getBlock(withClauseSyntax) as BasicBlock;
    return builder.withCluster("with", () => {
      const bodySyntax = this.getSyntax(match, "body");
      const bodyBlock = getBlock(bodySyntax) as BasicBlock;

      if (withClauseBlock.exit && bodyBlock.entry)
        builder.addEdge(withClauseBlock.exit, bodyBlock.entry);

      return blockHandler.update({
        entry: withClauseBlock.entry,
        exit: bodyBlock.exit,
      });
    });
  }

  private processComment(
    commentSyntax: Parser.SyntaxNode,
    builder: Builder,
  ): BasicBlock {
    // We only ever ger here when marker comments are enabled,
    // and only for marker comments as the rest are filtered out.
    const commentNode = builder.addNode("MARKER_COMMENT", commentSyntax.text);
    if (this.markerPattern) {
      const marker = commentSyntax.text.match(this.markerPattern)?.[1];
      if (marker) builder.addMarker(commentNode, marker);
    }
    return { entry: commentNode, exit: commentNode };
  }

  private processMatchStatement(
    matchSyntax: Parser.SyntaxNode,
    builder: Builder,
  ): BasicBlock {
    const blockHandler = new BlockHandler();
    const match = this.matchQuery(
      matchSyntax,
      "match",
      `
      (match_statement
        subject: (_) @subject
          body: (block 
            alternative: (case_clause)+  @case
          )
      ) @match
      `,
    );

    const subjectSyntax = this.getSyntax(match, "subject");
    const alternatives = this.getSyntaxMany(match, "case").map((caseSyntax) => {
      const patterns = caseSyntax.children.filter(
        (c) => c.type === "case_pattern",
      ) as Parser.SyntaxNode[];
      const consequence = caseSyntax.childForFieldName(
        "consequence",
      ) as Parser.SyntaxNode;
      return { consequence, patterns };
    });

    const getBlock = this.blockGetter(blockHandler);

    const subjectBlock = getBlock(subjectSyntax) as BasicBlock;
    const mergeNode = builder.addNode("MERGE", "match merge");

    // This is the case where case matches
    if (subjectBlock.exit)
      builder.addEdge(subjectBlock.exit, mergeNode, "alternative");

    let previous = subjectBlock.exit as string;
    for (const {
      consequence: consequenceSyntax,
      patterns: patternSyntaxMany,
    } of alternatives) {
      const consequenceBlock = getBlock(consequenceSyntax);
      const patternNode = builder.addNode(
        "CASE_CONDITION",
        `case ${patternSyntaxMany.map((pat) => pat.text).join(", ")}:`,
      );

      if (consequenceBlock?.entry)
        builder.addEdge(patternNode, consequenceBlock.entry, "consequence");
      if (consequenceBlock?.exit)
        builder.addEdge(consequenceBlock.exit, mergeNode, "regular");
      if (this.flatSwitch) {
        builder.addEdge(previous, patternNode, "regular");
      } else {
        if (previous) builder.addEdge(previous, patternNode, "alternative");
        previous = patternNode;
      }
    }

    return blockHandler.update({ entry: subjectBlock.entry, exit: mergeNode });
  }

  private processContinueStatement(
    _continueSyntax: Parser.SyntaxNode,
    builder: Builder,
  ): BasicBlock {
    const continueNode = builder.addNode("CONTINUE", "CONTINUE");
    return { entry: continueNode, exit: null, continues: [continueNode] };
  }
  private processBreakStatement(
    _breakSyntax: Parser.SyntaxNode,
    builder: Builder,
  ): BasicBlock {
    const breakNode = builder.addNode("BREAK", "BREAK");
    return { entry: breakNode, exit: null, breaks: [breakNode] };
  }

  private processIfStatement(
    ifNode: Parser.SyntaxNode,
    builder: Builder,
  ): BasicBlock {
    const matcher = new BlockMatcher(this.processBlock.bind(this), ifNode, "if",
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

    const condSyntax = matcher.getSyntax("if-cond");
    const thenSyntax = matcher.getSyntax("then");
    const elifCondSyntaxMany = matcher.getSyntaxMany("elif-cond");
    const elifSyntaxMany = matcher.getSyntaxMany("elif");
    const elseSyntax = matcher.getSyntax("else");


    const condBlock = matcher.getBlock(condSyntax);
    const thenBlock = matcher.getBlock(thenSyntax);
    const elifCondBlocks = elifCondSyntaxMany.map((syntax) => matcher.getBlock(syntax));
    const elifBlocks = elifSyntaxMany.map((syntax) => matcher.getBlock(syntax));
    const elseBlock = matcher.getBlock(elseSyntax);

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

  private matchQuery(
    syntax: Parser.SyntaxNode,
    mainName: string,
    queryString: string,
  ) {
    return matchQuery(syntax, mainName, queryString);
  }

  private matchExistsIn(
    syntax: Parser.SyntaxNode,
    mainName: string,
    queryString: string,
  ): boolean {
    const language = syntax.tree.getLanguage();
    const query = language.query(queryString);
    const matches = query.matches(syntax);
    return matches.length > 0;
  }

  private getSyntax(
    match: Parser.QueryMatch,
    name: string,
  ): Parser.SyntaxNode | undefined {
    return this.getSyntaxMany(match, name)[0];
  }

  private getSyntaxMany(
    match: Parser.QueryMatch,
    name: string,
  ): Parser.SyntaxNode[] {
    return match.captures
      .filter((capture) => capture.name === name)
      .map((capture) => capture.node);
  }

  private blockGetter(blockHandler: BlockHandler) {
    const getBlock = (syntax: Parser.SyntaxNode | null | undefined) =>
      syntax ? blockHandler.update(this.processBlock(syntax)) : null;
    return getBlock;
  }

  private processForStatement(
    forNode: Parser.SyntaxNode,
    builder: Builder,
  ): BasicBlock {
    const blockHandler = new BlockHandler();
    const match = this.matchQuery(
      forNode,
      "for",
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

    const bodySyntax = this.getSyntax(match, "body");
    const elseSyntax = this.getSyntax(match, "else");

    const getBlock = this.blockGetter(blockHandler);

    const bodyBlock = getBlock(bodySyntax);
    const elseBlock = getBlock(elseSyntax);

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

    blockHandler.forEachContinue((continueNode) => {
      builder.addEdge(continueNode, headNode);
    });

    blockHandler.forEachBreak((breakNode) => {
      builder.addEdge(breakNode, exitNode);
    });

    return blockHandler.update({ entry: headNode, exit: exitNode });
  }

  private processWhileStatement(
    whileSyntax: Parser.SyntaxNode,
    builder: Builder,
  ): BasicBlock {
    const blockHandler = new BlockHandler();
    const match = this.matchQuery(
      whileSyntax,
      "while",
      `
    (while_statement
        condition: (_) @cond
        body: (_) @body
        alternative: (else_clause (_) @else)?
        ) @while
    `,
    );

    const condSyntax = this.getSyntax(match, "cond");
    const bodySyntax = this.getSyntax(match, "body");
    const elseSyntax = this.getSyntax(match, "else");

    const getBlock = this.blockGetter(blockHandler);

    const condBlock = getBlock(condSyntax) as BasicBlock;
    const bodyBlock = getBlock(bodySyntax) as BasicBlock;
    const elseBlock = getBlock(elseSyntax);

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

    blockHandler.forEachContinue((continueNode) => {
      if (condBlock.entry) builder.addEdge(continueNode, condBlock.entry);
    });

    blockHandler.forEachBreak((breakNode) => {
      builder.addEdge(breakNode, exitNode);
    });

    return blockHandler.update({ entry: condBlock.entry, exit: exitNode });
  }
}
