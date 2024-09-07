import { MultiDirectedGraph } from "graphology";
import Parser from "web-tree-sitter";

type Node = Parser.SyntaxNode;

type NodeType =
  | "MARKER_COMMENT"
  | "LOOP_HEAD"
  | "LOOP_EXIT"
  | "SELECT"
  | "SELECT_MERGE"
  | "COMMUNICATION_CASE"
  | "TYPE_CASE"
  | "TYPE_SWITCH_MERGE"
  | "TYPE_SWITCH_VALUE"
  | "GOTO"
  | "LABEL"
  | "CONTINUE"
  | "BREAK"
  | "START"
  | "END"
  | "CONDITION"
  | "STATEMENT"
  | "RETURN"
  | "EMPTY"
  | "MERGE"
  | "FOR_INIT"
  | "FOR_CONDITION"
  | "FOR_UPDATE"
  | "FOR_EXIT"
  | "SWITCH_CONDITION"
  | "SWITCH_MERGE"
  | "CASE_CONDITION";
type EdgeType = "regular" | "consequence" | "alternative";
interface GraphNode {
  type: NodeType;
  code: string;
  lines: number;
  markers: string[];
}

interface GraphEdge {
  type: EdgeType;
}

interface Goto {
  label: string;
  node: string;
}

interface BasicBlock {
  entry: string | null;
  exit: string | null;
  continues?: string[];
  breaks?: string[];
  // From label name to node
  labels?: Map<string, string>;
  // Target label
  gotos?: Goto[];
}

export interface CFG {
  graph: MultiDirectedGraph<GraphNode, GraphEdge>;
  entry: string;
}

class BlockHandler {
  private breaks: string[] = [];
  private continues: string[] = [];
  private labels: Map<string, string> = new Map();
  private gotos: Array<{ label: string; node: string }> = [];

  public forEachBreak(callback: (breakNode: string) => void) {
    this.breaks.forEach(callback);
    this.breaks = [];
  }

  public forEachContinue(callback: (continueNode: string) => void) {
    this.continues.forEach(callback);
    this.continues = [];
  }

  public processGotos(callback: (gotoNode: string, labelNode: string) => void) {
    this.gotos.forEach((goto) => {
      const labelNode = this.labels.get(goto.label);
      if (labelNode) {
        callback(goto.node, labelNode);
      }
      // If we get here, then the goto didn't have a matching label.
      // This is a user problem, not graphing problem.
    });
  }

  public update(block: BasicBlock): BasicBlock {
    this.breaks.push(...(block.breaks || []));
    this.continues.push(...(block.continues || []));
    this.gotos.push(...(block.gotos || []));
    block.labels?.forEach((value, key) => this.labels.set(key, value));

    return {
      entry: block.entry,
      exit: block.exit,
      breaks: this.breaks,
      continues: this.continues,
      gotos: this.gotos,
      labels: this.labels,
    };
  }
}

export function mergeNodeAttrs(from: GraphNode, into: GraphNode): GraphNode {
  return {
    type: from.type,
    code: `${from.code}\n${into.code}`,
    lines: from.lines + into.lines,
  };
}
interface Case {
  conditionEntry: string | null;
  conditionExit: string | null;
  consequenceEntry: string | null;
  consequenceExit: string | null;
  alternativeExit: string;
  hasFallthrough: boolean;
  isDefault: boolean;
}

interface BuilderOptions {
  flatSwitch?: boolean;
  markerPattern?: RegExp;
}

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

  public buildCFG(functionNode: Node): CFG {
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
    if (source === undefined) {
      throw new Error("Undefined source");
    } else if (target === undefined) {
      throw new Error("Undefined target");
    }
    if (!this.graph.hasEdge(source, target)) {
      this.graph.addEdge(source, target, { type });
    }
  }

  private getChildFieldText(node: Node, fieldName: string): string {
    const child = node.childForFieldName(fieldName);
    return child ? child.text : "";
  }

  private processStatements(statements: Node[]): BasicBlock {
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

  private processBlock(node: Node | null): BasicBlock {
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
      case "select_statement":
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
    if (previous) {
      this.addEdge(previous, mergeNode, "alternative");
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

        const conditionNode = this.addNode(
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
    const name = gotoSyntax.firstNamedChild.text;
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
    ifNode: Node,
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

    this.addEdge(conditionNode, thenEntry || mergeNode, "consequence");
    if (thenExit) this.addEdge(thenExit, mergeNode);

    if (elseEntry) {
      this.addEdge(conditionNode, elseEntry, "alternative");
      if (elseExit && !elseIf) this.addEdge(elseExit, mergeNode);
    } else {
      this.addEdge(conditionNode, mergeNode, "alternative");
    }

    return blockHandler.update({ entry: conditionNode, exit: mergeNode });
  }

  private processForStatement(forNode: Node): BasicBlock {
    const blockHandler = new BlockHandler();
    switch (forNode.namedChildCount) {
      // One child means only loop body, two children means loop head.
      case 1: {
        const headNode = this.addNode("LOOP_HEAD", "loop head");
        const { entry: bodyEntry, exit: bodyExit } = blockHandler.update(
          this.processBlock(forNode.firstNamedChild),
        );
        if (bodyEntry) this.addEdge(headNode, bodyEntry);
        if (bodyExit) this.addEdge(bodyExit, headNode);
        const exitNode = this.addNode("LOOP_EXIT", "loop exit");
        blockHandler.forEachBreak((breakNode) => {
          this.addEdge(breakNode, exitNode);
        });

        blockHandler.forEachContinue((continueNode) => {
          this.addEdge(continueNode, headNode);
        });
        return blockHandler.update({ entry: headNode, exit: exitNode });
      }
      // TODO: Handle the case where there is no loop condition, only init and update.
      case 2: {
        const headNode = this.addNode("LOOP_HEAD", "loop head");
        const { entry: bodyEntry, exit: bodyExit } = blockHandler.update(
          this.processBlock(forNode.namedChildren[1]),
        );
        const exitNode = this.addNode("LOOP_EXIT", "loop exit");
        if (bodyEntry) {
          this.addEdge(headNode, bodyEntry, "consequence");
        }
        this.addEdge(headNode, exitNode, "alternative");
        if (bodyExit) this.addEdge(bodyExit, headNode);
        blockHandler.forEachBreak((breakNode) => {
          this.addEdge(breakNode, exitNode);
        });

        blockHandler.forEachContinue((continueNode) => {
          this.addEdge(continueNode, headNode);
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
