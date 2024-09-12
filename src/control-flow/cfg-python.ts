import { MultiDirectedGraph } from "graphology";
import Parser from "web-tree-sitter";
import {
  BlockHandler,
  type BasicBlock,
  type BuilderOptions,
  type CFG,
  type EdgeType,
  type GraphEdge,
  type GraphNode,
  type NodeType,
} from "./cfg-defs";

export class CFGBuilder {
  private graph: MultiDirectedGraph<GraphNode, GraphEdge>;
  private entry: string;
  private nodeId: number;
  private readonly flatSwitch: boolean;
  private readonly markerPattern: RegExp | null;

  constructor(options?: BuilderOptions) {
    this.graph = new MultiDirectedGraph();
    this.nodeId = 0;
    this.entry = null;

    this.flatSwitch = options?.flatSwitch ?? false;
    this.markerPattern = options?.markerPattern ?? null;
  }

  public buildCFG(functionNode: Parser.SyntaxNode): CFG {
    const bodyNode = functionNode.childForFieldName("body");
    if (bodyNode) {
      const blockHandler = new BlockHandler();
      const { entry } = blockHandler.update(
        this.processStatements(bodyNode.namedChildren),
      );

      const startNode = this.addNode("START", "START");
      // `entry` will be non-null for any valid code
      if (entry) this.addEdge(startNode, entry);
      this.entry = startNode;
    }
    return { graph: this.graph, entry: this.entry };
  }

  private addNode(type: NodeType, code: string, lines: number = 1): string {
    const id = `node${this.nodeId++}`;
    this.graph.addNode(id, { type, code, lines, markers: [] });
    return id;
  }

  private addMarker(node: string, marker: string) {
    this.graph.getNodeAttributes(node).markers.push(marker);
  }

  private addEdge(
    source: string,
    target: string,
    type: EdgeType = "regular",
  ): void {
    if (!this.graph.hasEdge(source, target)) {
      this.graph.addEdge(source, target, { type });
    }
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
      const emptyNode = this.addNode("EMPTY", "empty block");
      return { entry: emptyNode, exit: emptyNode };
    }

    let entry: string | null = null;
    let previous: string | null = null;
    for (const statement of codeStatements) {
      const { entry: currentEntry, exit: currentExit } = blockHandler.update(
        this.processBlock(statement),
      );
      if (!entry) entry = currentEntry;
      if (previous && currentEntry) this.addEdge(previous, currentEntry);
      previous = currentExit;
    }
    return blockHandler.update({ entry, exit: previous });
  }

  private processBlock(node: Parser.SyntaxNode | null): BasicBlock {
    if (!node) return { entry: null, exit: null };

    switch (node.type) {
      case "block":
        return this.processStatements(node.namedChildren);
      case "if_statement":
        return this.processIfStatement(node);
      case "for_statement":
        return this.processForStatement(node);
      case "while_statement":
        return this.processWhileStatement(node);
      case "match_statement":
        return this.processMatchStatement(node);
      case "return_statement": {
        const returnNode = this.addNode("RETURN", node.text);
        return { entry: returnNode, exit: null };
      }
      case "break_statement":
        return this.processBreakStatement(node);
      case "continue_statement":
        return this.processContinueStatement(node);
      case "comment":
        return this.processComment(node);
      default: {
        const newNode = this.addNode("STATEMENT", node.text);
        return { entry: newNode, exit: newNode };
      }
    }
  }
  private processComment(commentSyntax: Parser.SyntaxNode): BasicBlock {
    // We only ever ger here when marker comments are enabled,
    // and only for marker comments as the rest are filtered out.
    const commentNode = this.addNode("MARKER_COMMENT", commentSyntax.text);
    if (this.markerPattern) {
      const marker = commentSyntax.text.match(this.markerPattern)?.[1];
      if (marker) this.addMarker(commentNode, marker);
    }
    return { entry: commentNode, exit: commentNode };
  }

  private processMatchStatement(matchSyntax: Parser.SyntaxNode): BasicBlock {
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
    const mergeNode = this.addNode("MERGE", "match merge");

    // This is the case where case matches
    if (subjectBlock.exit)
      this.addEdge(subjectBlock.exit, mergeNode, "alternative");

    let previous = subjectBlock.exit as string;
    for (const {
      consequence: consequenceSyntax,
      patterns: patternSyntaxMany,
    } of alternatives) {
      const consequenceBlock = getBlock(consequenceSyntax);
      const patternNode = this.addNode(
        "CASE_CONDITION",
        `case ${patternSyntaxMany.map((pat) => pat.text).join(", ")}:`,
      );

      if (consequenceBlock?.entry)
        this.addEdge(patternNode, consequenceBlock.entry, "consequence");
      if (consequenceBlock?.exit)
        this.addEdge(consequenceBlock.exit, mergeNode, "regular");
      if (previous) this.addEdge(previous, patternNode, "alternative");
      previous = patternNode;
    }

    return blockHandler.update({ entry: subjectBlock.entry, exit: mergeNode });
  }

  private processContinueStatement(
    _continueSyntax: Parser.SyntaxNode,
  ): BasicBlock {
    const continueNode = this.addNode("CONTINUE", "CONTINUE");
    return { entry: continueNode, exit: null, continues: [continueNode] };
  }
  private processBreakStatement(_breakSyntax: Parser.SyntaxNode): BasicBlock {
    const breakNode = this.addNode("BREAK", "BREAK");
    return { entry: breakNode, exit: null, breaks: [breakNode] };
  }

  private processIfStatement(ifNode: Parser.SyntaxNode): BasicBlock {
    const blockHandler = new BlockHandler();
    const match = this.matchQuery(
      ifNode,
      "if",
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

    const condSyntax = this.getSyntax(match, "if-cond");
    const thenSyntax = this.getSyntax(match, "then");
    const elifCondSyntaxMany = this.getSyntaxMany(match, "elif-cond");
    const elifSyntaxMany = this.getSyntaxMany(match, "elif");
    const elseSyntax = this.getSyntax(match, "else");

    const getBlock = this.blockGetter(blockHandler);

    const condBlock = getBlock(condSyntax);
    const thenBlock = getBlock(thenSyntax);
    const elifCondBlocks = elifCondSyntaxMany.map((syntax) => getBlock(syntax));
    const elifBlocks = elifSyntaxMany.map((syntax) => getBlock(syntax));
    const elseBlock = getBlock(elseSyntax);

    const mergeNode = this.addNode("MERGE", "if merge");
    const headNode = this.addNode("CONDITION", "if condition");

    if (condBlock?.entry) this.addEdge(headNode, condBlock.entry);

    const conds = [condBlock, ...elifCondBlocks];
    const consequences = [thenBlock, ...elifBlocks];
    let previous: null | BasicBlock = null;
    for (let i = 0; i < conds.length; ++i) {
      const conditionBlock = conds[i];
      const consequenceBlock = consequences[i];

      if (previous?.exit && conditionBlock?.entry)
        this.addEdge(previous.exit, conditionBlock.entry, "alternative");
      if (conditionBlock?.exit && consequenceBlock?.entry)
        this.addEdge(
          conditionBlock.exit,
          consequenceBlock.entry,
          "consequence",
        );
      if (consequenceBlock?.exit)
        this.addEdge(consequenceBlock.exit, mergeNode);

      previous = conditionBlock;
    }
    if (elseBlock) {
      if (previous?.exit && elseBlock.entry)
        this.addEdge(previous.exit, elseBlock.entry, "alternative");
      if (elseBlock.exit) this.addEdge(elseBlock.exit, mergeNode);
    } else if (previous?.exit) {
      this.addEdge(previous.exit, mergeNode, "alternative");
    }

    return blockHandler.update({ entry: headNode, exit: mergeNode });
  }

  private matchQuery(
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

  private getSyntax(match: Parser.QueryMatch, name: string): Parser.SyntaxNode {
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
    const getBlock = (syntax: Parser.SyntaxNode | null) =>
      syntax ? blockHandler.update(this.processBlock(syntax)) : null;
    return getBlock;
  }

  private processForStatement(forNode: Parser.SyntaxNode): BasicBlock {
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

    const exitNode = this.addNode("FOR_EXIT", "loop exit");
    const headNode = this.addNode("LOOP_HEAD", "loop head");
    const headBlock = { entry: headNode, exit: headNode };

    /*
    head +-> body -> head
         --> else / exit
    break -> exit
    continue -> head
    */
    if (bodyBlock?.entry)
      this.addEdge(headBlock.exit, bodyBlock.entry, "consequence");
    if (bodyBlock?.exit) this.addEdge(bodyBlock.exit, headBlock.entry);
    if (elseBlock) {
      if (elseBlock.entry)
        this.addEdge(headBlock.exit, elseBlock.entry, "alternative");
      if (elseBlock.exit) this.addEdge(elseBlock.exit, exitNode);
    } else {
      this.addEdge(headBlock.exit, exitNode, "alternative");
    }

    blockHandler.forEachContinue((continueNode) => {
      this.addEdge(continueNode, headNode);
    });

    blockHandler.forEachBreak((breakNode) => {
      this.addEdge(breakNode, exitNode);
    });

    return blockHandler.update({ entry: headNode, exit: exitNode });
  }

  private processWhileStatement(whileSyntax: Parser.SyntaxNode): BasicBlock {
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

    const exitNode = this.addNode("FOR_EXIT", "loop exit");

    if (condBlock.exit) {
      if (bodyBlock.entry)
        this.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
      this.addEdge(condBlock.exit, elseBlock?.entry ?? exitNode, "alternative");
    }
    if (elseBlock?.exit) this.addEdge(elseBlock.exit, exitNode);

    if (condBlock.entry && bodyBlock.exit)
      this.addEdge(bodyBlock.exit, condBlock.entry);

    blockHandler.forEachContinue((continueNode) => {
      if (condBlock.entry) this.addEdge(continueNode, condBlock.entry);
    });

    blockHandler.forEachBreak((breakNode) => {
      this.addEdge(breakNode, exitNode);
    });

    return blockHandler.update({ entry: condBlock.entry, exit: exitNode });
  }
}
