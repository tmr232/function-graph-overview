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

interface SwitchOptions {
  noImplicitDefault: boolean;
}

export class CFGBuilder {
  private builder: Builder = new Builder();
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

    switch (node.type) {
      case "block":
        return this.processStatements(node.namedChildren);
      case "if_statement":
        return this.processIfStatement(node);
      case "for_statement":
        return this.processForStatement(node);
      case "expression_switch_statement":
      case "type_switch_statement":
        return this.processSwitchlike(node);
      case "select_statement":
        return this.processSwitchlike(node, { noImplicitDefault: true });
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
    const commentNode = this.builder.addNode("MARKER_COMMENT", commentSyntax.text);
    if (this.markerPattern) {
      const marker = commentSyntax.text.match(this.markerPattern)?.[1];
      if (marker) this.builder.addMarker(commentNode, marker);
    }
    return { entry: commentNode, exit: commentNode };
  }

  private buildSwitch(
    cases: Case[],
    mergeNode: string,
    switchHeadNode: string,
    options?: SwitchOptions,
  ) {
    let fallthrough: string | null = null;
    let previous: string | null = switchHeadNode;
    if (options?.noImplicitDefault) {
      // This prevents the linking of the switch head to the merge node.
      // It is required for select statements, as they block until satisfied.
      previous = null;
    }
    cases.forEach((thisCase) => {
      if (this.flatSwitch) {
        if (thisCase.consequenceEntry) {
          this.builder.addEdge(switchHeadNode, thisCase.consequenceEntry);
          if (fallthrough) {
            this.builder.addEdge(fallthrough, thisCase.consequenceEntry);
          }
          if (thisCase.isDefault) {
            previous = null;
          }
        }
      } else {
        if (fallthrough && thisCase.consequenceEntry) {
          this.builder.addEdge(fallthrough, thisCase.consequenceEntry);
        }
        if (previous && thisCase.conditionEntry) {
          this.builder.addEdge(
            previous,
            thisCase.conditionEntry,
            "alternative" as EdgeType,
          );
        }

        if (thisCase.consequenceEntry && thisCase.conditionExit)
          this.builder.addEdge(
            thisCase.conditionExit,
            thisCase.consequenceEntry,
            "consequence",
          );

        // Update for next case
        previous = thisCase.isDefault ? null : thisCase.alternativeExit;
      }

      // Fallthrough is the same for both flat and non-flat layouts.
      if (!thisCase.hasFallthrough && thisCase.consequenceExit) {
        this.builder.addEdge(thisCase.consequenceExit, mergeNode);
      }
      // Update for next case
      fallthrough = thisCase.hasFallthrough ? thisCase.consequenceExit : null;
    });
    // Connect the last node to the merge node.
    // No need to handle `fallthrough` here as it is not allowed for the last case.
    if (previous) {
      this.builder.addEdge(previous, mergeNode, "alternative");
    }
  }

  private collectCases(
    switchSyntax: Parser.SyntaxNode,
    blockHandler: BlockHandler,
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

        const conditionNode = this.builder.addNode(
          "CASE_CONDITION",
          isDefault ? "default" : (caseSyntax.firstNamedChild?.text ?? ""),
        );
        const consequenceNode = blockHandler.update(
          this.processStatements(consequence),
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

  private processSwitchlike(
    switchSyntax: Parser.SyntaxNode,
    options?: SwitchOptions,
  ): BasicBlock {
    const blockHandler = new BlockHandler();

    const cases = this.collectCases(switchSyntax, blockHandler);
    const headNode = this.builder.addNode(
      "SWITCH_CONDITION",
      this.getChildFieldText(switchSyntax, "value"),
    );
    const mergeNode: string = this.builder.addNode("SWITCH_MERGE", "");
    this.buildSwitch(cases, mergeNode, headNode, options);

    blockHandler.forEachBreak((breakNode) => {
      this.builder.addEdge(breakNode, mergeNode);
    });

    return blockHandler.update({ entry: headNode, exit: mergeNode });
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
    const name = this.getChildFieldText(labelSyntax, "label");
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

  private processIfStatement(
    ifNode: Parser.SyntaxNode,
    mergeNode: string | null = null,
  ): BasicBlock {
    const blockHandler = new BlockHandler();
    const conditionChild = ifNode.childForFieldName("condition");
    const conditionNode = this.builder.addNode(
      "CONDITION",
      conditionChild ? conditionChild.text : "Unknown condition",
    );

    mergeNode ??= this.builder.addNode("MERGE", "MERGE");

    const consequenceChild = ifNode.childForFieldName("consequence");

    const { entry: thenEntry, exit: thenExit } = blockHandler.update(
      this.processBlock(consequenceChild),
    );

    const alternativeChild = ifNode.childForFieldName("alternative");
    const elseIf = alternativeChild?.type === "if_statement";
    const { entry: elseEntry, exit: elseExit } = (() => {
      if (elseIf) {
        return blockHandler.update(
          this.processIfStatement(alternativeChild, mergeNode),
        );
      } else {
        return blockHandler.update(this.processBlock(alternativeChild));
      }
    })();

    this.builder.addEdge(conditionNode, thenEntry || mergeNode, "consequence");
    if (thenExit) this.builder.addEdge(thenExit, mergeNode);

    if (elseEntry) {
      this.builder.addEdge(conditionNode, elseEntry, "alternative");
      if (elseExit && !elseIf) this.builder.addEdge(elseExit, mergeNode);
    } else {
      this.builder.addEdge(conditionNode, mergeNode, "alternative");
    }

    return blockHandler.update({ entry: conditionNode, exit: mergeNode });
  }

  private processForStatement(forNode: Parser.SyntaxNode): BasicBlock {
    const blockHandler = new BlockHandler();
    switch (forNode.namedChildCount) {
      // One child means only loop body, two children means loop head.
      case 1: {
        const headNode = this.builder.addNode("LOOP_HEAD", "loop head");
        const { entry: bodyEntry, exit: bodyExit } = blockHandler.update(
          this.processBlock(forNode.firstNamedChild),
        );
        if (bodyEntry) this.builder.addEdge(headNode, bodyEntry);
        if (bodyExit) this.builder.addEdge(bodyExit, headNode);
        const exitNode = this.builder.addNode("LOOP_EXIT", "loop exit");
        blockHandler.forEachBreak((breakNode) => {
          this.builder.addEdge(breakNode, exitNode);
        });

        blockHandler.forEachContinue((continueNode) => {
          this.builder.addEdge(continueNode, headNode);
        });
        return blockHandler.update({ entry: headNode, exit: exitNode });
      }
      // TODO: Handle the case where there is no loop condition, only init and update.
      case 2: {
        const headNode = this.builder.addNode("LOOP_HEAD", "loop head");
        const { entry: bodyEntry, exit: bodyExit } = blockHandler.update(
          this.processBlock(forNode.namedChildren[1]),
        );
        const exitNode = this.builder.addNode("LOOP_EXIT", "loop exit");
        if (bodyEntry) {
          this.builder.addEdge(headNode, bodyEntry, "consequence");
        }
        this.builder.addEdge(headNode, exitNode, "alternative");
        if (bodyExit) this.builder.addEdge(bodyExit, headNode);
        blockHandler.forEachBreak((breakNode) => {
          this.builder.addEdge(breakNode, exitNode);
        });

        blockHandler.forEachContinue((continueNode) => {
          this.builder.addEdge(continueNode, headNode);
        });
        return blockHandler.update({ entry: headNode, exit: exitNode });
      }
      default:
        throw new Error(
          `Unsupported for type: ${forNode.firstNamedChild?.type}`,
        );
    }
  }
}
