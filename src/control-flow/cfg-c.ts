import { MultiDirectedGraph } from "graphology";
import Parser from "web-tree-sitter";
import {
  BlockHandler,
  type BasicBlock,
  type BuilderOptions,
  type Case,
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

      blockHandler.processGotos((gotoNode, labelNode) =>
        this.addEdge(gotoNode, labelNode),
      );

      const startNode = this.addNode("START", "START");
      // `entry` will be non-null for any valid code
      this.addEdge(startNode, entry);
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

  private getChildFieldText(
    node: Parser.SyntaxNode,
    fieldName: string,
  ): string {
    const child = node.childForFieldName(fieldName);
    return child ? child.text : "";
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
      case "compound_statement":
        return this.processStatements(node.namedChildren);
      case "if_statement":
        return this.processIfStatement(node);
      case "for_statement":
        return this.processForStatement(node);
      case "while_statement":
        return this.processWhileStatement(node);
      case "do_statement":
        return this.processDoStatement(node);
      case "switch_statement":
        return this.processSwitchlike(node);
      case "return_statement": {
        const returnNode = this.addNode("RETURN", node.text);
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

  private buildSwitch(
    cases: Case[],
    mergeNode: string,
    switchHeadNode: string,
  ) {
    let fallthrough: string | null = null;
    let previous: string | null = null;
    if (!this.flatSwitch && cases[0]?.conditionEntry) {
      this.addEdge(switchHeadNode, cases[0].conditionEntry);
    }
    cases.forEach((thisCase) => {
      if (this.flatSwitch) {
        if (thisCase.consequenceEntry) {
          this.addEdge(switchHeadNode, thisCase.consequenceEntry);
          if (fallthrough) {
            this.addEdge(fallthrough, thisCase.consequenceEntry);
          }
        }
      } else {
        if (fallthrough && thisCase.consequenceEntry) {
          this.addEdge(fallthrough, thisCase.consequenceEntry);
        }
        if (previous && thisCase.conditionEntry) {
          this.addEdge(
            previous,
            thisCase.conditionEntry,
            "alternative" as EdgeType,
          );
        }

        if (thisCase.consequenceEntry && thisCase.conditionExit)
          this.addEdge(
            thisCase.conditionExit,
            thisCase.consequenceEntry,
            "consequence",
          );

        // Update for next case
        previous = thisCase.isDefault ? null : thisCase.alternativeExit;
      }

      // Fallthrough is the same for both flat and non-flat layouts.
      if (!thisCase.hasFallthrough && thisCase.consequenceExit) {
        this.addEdge(thisCase.consequenceExit, mergeNode);
      }
      // Update for next case
      fallthrough = thisCase.hasFallthrough ? thisCase.consequenceExit : null;
    });
    // Connect the last node to the merge node.
    // No need to handle `fallthrough` here as it is not allowed for the last case.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (previous) {
      this.addEdge(previous, mergeNode, "alternative");
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (fallthrough) {
      this.addEdge(fallthrough, mergeNode, "regular");
    }
  }

  private collectCases(
    switchSyntax: Parser.SyntaxNode,
    blockHandler: BlockHandler,
  ): Case[] {
    const cases: Case[] = [];
    const caseTypes = ["case_statement"];
    switchSyntax.namedChildren[1].namedChildren
      .filter((child) => caseTypes.includes(child.type))
      .forEach((caseSyntax) => {
        const isDefault = caseSyntax.type === "default_case";

        const consequence = caseSyntax.namedChildren.slice(isDefault ? 0 : 1);
        const hasFallthrough = true;

        const conditionNode = this.addNode(
          "CASE_CONDITION",
          isDefault ? "default" : (caseSyntax.firstNamedChild?.text ?? ""),
        );
        // let consequenceBlock;
        // if (consequence.length) {
        //   consequenceBlock = blockHandler.update(
        //     this.processStatements(consequence),
        //   );
        // } else {
        //   const consequenceNode = this.addNode("EMPTY", "empty case body");
        //   consequenceBlock = { entry: consequenceNode, exit: consequenceNode };
        // }

        const consequenceBlock = blockHandler.update(
          this.processStatements(consequence),
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

  private processSwitchlike(switchSyntax: Parser.SyntaxNode): BasicBlock {
    const blockHandler = new BlockHandler();

    const cases = this.collectCases(switchSyntax, blockHandler);
    const headNode = this.addNode(
      "SWITCH_CONDITION",
      this.getChildFieldText(switchSyntax, "value"),
    );
    const mergeNode: string = this.addNode("SWITCH_MERGE", "");
    this.buildSwitch(cases, mergeNode, headNode);

    blockHandler.forEachBreak((breakNode) => {
      this.addEdge(breakNode, mergeNode);
    });

    return blockHandler.update({ entry: headNode, exit: mergeNode });
  }

  private processGotoStatement(gotoSyntax: Parser.SyntaxNode): BasicBlock {
    const name = gotoSyntax.firstNamedChild?.text as string;
    const gotoNode = this.addNode("GOTO", name);
    return {
      entry: gotoNode,
      exit: null,
      gotos: [{ node: gotoNode, label: name }],
    };
  }
  private processLabeledStatement(labelSyntax: Parser.SyntaxNode): BasicBlock {
    const blockHandler = new BlockHandler();
    const name = this.getChildFieldText(labelSyntax, "label");
    const labelNode = this.addNode("LABEL", name);
    const { entry: labeledEntry, exit: labeledExit } = blockHandler.update(
      this.processBlock(labelSyntax.namedChildren[1]),
    );
    if (labeledEntry) this.addEdge(labelNode, labeledEntry);
    return blockHandler.update({
      entry: labelNode,
      exit: labeledExit,
      labels: new Map([[name, labelNode]]),
    });
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

  private processIfStatement(
    ifNode: Parser.SyntaxNode,
    mergeNode: string | null = null,
  ): BasicBlock {
    const blockHandler = new BlockHandler();

    const conditionChild = ifNode.childForFieldName("condition");
    const conditionNode = this.addNode(
      "CONDITION",
      conditionChild ? conditionChild.text : "Unknown condition",
    );

    mergeNode ??= this.addNode("MERGE", "MERGE");

    const consequenceChild = ifNode.childForFieldName("consequence");

    const { entry: thenEntry, exit: thenExit } = blockHandler.update(
      this.processBlock(consequenceChild),
    );

    if (thenEntry) this.addEdge(conditionNode, thenEntry, "consequence");
    if (thenExit) this.addEdge(thenExit, mergeNode, "regular");

    const alternativeChild = ifNode.childForFieldName("alternative");

    if (alternativeChild) {
      // We have an else or else-if
      const maybeElseIf = alternativeChild.firstNamedChild;
      const elseIf = maybeElseIf?.type === "if_statement";
      if (elseIf) {
        const { entry: elseEntry } = blockHandler.update(
          this.processIfStatement(maybeElseIf, mergeNode),
        );
        if (elseEntry) this.addEdge(conditionNode, elseEntry, "alternative");
        // No need to connect the exit as it's already linked to the else node.
      } else {
        // Normal else
        const { entry: elseEntry, exit: elseExit } = blockHandler.update(
          this.processBlock(alternativeChild),
        );
        if (elseEntry) this.addEdge(conditionNode, elseEntry, "alternative");
        // This was processed like any other block, so we need to link the merge node.
        if (elseExit) this.addEdge(elseExit, mergeNode, "regular");
      }
    } else {
      // No else clause
      this.addEdge(conditionNode, mergeNode, "alternative");
    }

    return blockHandler.update({ entry: conditionNode, exit: mergeNode });
  }

  private processForStatement(forNode: Parser.SyntaxNode): BasicBlock {
    const blockHandler = new BlockHandler();
    const language = forNode.tree.getLanguage();
    const query = language.query(`
      (for_statement
	        initializer: (_)? @init
          condition: (_)? @cond
          update: (_)? @update
          body: (_) @body) @for
      `);
    const matches = query.matches(forNode);
    const match = (() => {
      for (const match of matches) {
        for (const capture of match.captures) {
          if (capture.name === "for" && capture.node.id === forNode.id) {
            return match;
          }
        }
      }
      throw new Error("No match found!");
    })();

    const getSyntax = (name: string): Parser.SyntaxNode | null =>
      match.captures.filter((capture) => capture.name === name)[0]?.node;

    const initSyntax = getSyntax("init");
    const condSyntax = getSyntax("cond");
    const updateSyntax = getSyntax("update");
    const bodySyntax = getSyntax("body");

    const getBlock = (syntax: Parser.SyntaxNode | null) =>
      syntax ? blockHandler.update(this.processBlock(syntax)) : null;

    const initBlock = getBlock(initSyntax);
    const condBlock = getBlock(condSyntax);
    const updateBlock = getBlock(updateSyntax);
    const bodyBlock = getBlock(bodySyntax);

    const entryNode = this.addNode("EMPTY", "loop head");
    const exitNode = this.addNode("FOR_EXIT", "loop exit");
    const headNode = this.addNode("LOOP_HEAD", "loop head");
    const headBlock = { entry: headNode, exit: headNode };

    const chain = (entry: string | null, blocks: (BasicBlock | null)[]) => {
      let prevExit: string | null = entry;
      for (const block of blocks) {
        if (!block) continue;
        if (prevExit && block.entry) this.addEdge(prevExit, block.entry);
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
          this.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
        this.addEdge(condBlock.exit, exitNode, "alternative");
        chain(bodyBlock?.exit ?? null, [headBlock, updateBlock, condBlock]);
      }
    } else {
      chain(topExit, [bodyBlock, headBlock, updateBlock, bodyBlock]);
    }

    blockHandler.forEachContinue((continueNode) => {
      this.addEdge(continueNode, headNode);
    });

    blockHandler.forEachBreak((breakNode) => {
      this.addEdge(breakNode, exitNode);
    });

    return blockHandler.update({ entry: entryNode, exit: exitNode });
  }

  private processWhileStatement(whileSyntax: Parser.SyntaxNode): BasicBlock {
    const blockHandler = new BlockHandler();
    const language = whileSyntax.tree.getLanguage();
    const query = language.query(`
    (while_statement
        condition: (_) @cond
        body: (_) @body
        ) @while
    `);
    const matches = query.matches(whileSyntax);
    const match = (() => {
      for (const match of matches) {
        for (const capture of match.captures) {
          if (capture.name === "while" && capture.node.id === whileSyntax.id) {
            return match;
          }
        }
      }
      throw new Error("No match found!");
    })();

    const getSyntax = (name: string): Parser.SyntaxNode | null =>
      match.captures.filter((capture) => capture.name === name)[0]?.node;

    const condSyntax = getSyntax("cond");
    const bodySyntax = getSyntax("body");

    const getBlock = (syntax: Parser.SyntaxNode | null) =>
      syntax ? blockHandler.update(this.processBlock(syntax)) : null;

    const condBlock = getBlock(condSyntax) as BasicBlock;
    const bodyBlock = getBlock(bodySyntax) as BasicBlock;

    const exitNode = this.addNode("FOR_EXIT", "loop exit");

    if (condBlock.exit) {
      if (bodyBlock.entry)
        this.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
      this.addEdge(condBlock.exit, exitNode, "alternative");
    }
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

  private processDoStatement(whileSyntax: Parser.SyntaxNode): BasicBlock {
    const blockHandler = new BlockHandler();
    const language = whileSyntax.tree.getLanguage();
    const query = language.query(`
    (do_statement
        body: (_) @body
        condition: (_) @cond
        ) @while
    `);
    const matches = query.matches(whileSyntax);
    const match = (() => {
      for (const match of matches) {
        for (const capture of match.captures) {
          if (capture.name === "while" && capture.node.id === whileSyntax.id) {
            return match;
          }
        }
      }
      throw new Error("No match found!");
    })();

    const getSyntax = (name: string): Parser.SyntaxNode | null =>
      match.captures.filter((capture) => capture.name === name)[0]?.node;

    const condSyntax = getSyntax("cond");
    const bodySyntax = getSyntax("body");

    const getBlock = (syntax: Parser.SyntaxNode | null) =>
      syntax ? blockHandler.update(this.processBlock(syntax)) : null;

    const condBlock = getBlock(condSyntax) as BasicBlock;
    const bodyBlock = getBlock(bodySyntax) as BasicBlock;

    const exitNode = this.addNode("FOR_EXIT", "loop exit");

    if (condBlock.exit) {
      if (bodyBlock.entry)
        this.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
      this.addEdge(condBlock.exit, exitNode, "alternative");
    }
    if (condBlock.entry && bodyBlock.exit)
      this.addEdge(bodyBlock.exit, condBlock.entry);

    blockHandler.forEachContinue((continueNode) => {
      if (condBlock.entry) this.addEdge(continueNode, condBlock.entry);
    });

    blockHandler.forEachBreak((breakNode) => {
      this.addEdge(breakNode, exitNode);
    });

    return blockHandler.update({ entry: bodyBlock.entry, exit: exitNode });
  }
}
