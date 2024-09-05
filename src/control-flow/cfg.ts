import { MultiDirectedGraph } from 'graphology';
import Parser from 'web-tree-sitter';

type Node = Parser.SyntaxNode;

type NodeType = 'LOOP_HEAD' | 'LOOP_EXIT' | 'SELECT' | 'SELECT_MERGE' | 'COMMUNICATION_CASE' | 'TYPE_CASE' | 'TYPE_SWITCH_MERGE' | 'TYPE_SWITCH_VALUE' | 'GOTO' | 'LABEL' | 'CONTINUE' | 'BREAK' | 'START' | 'END' | 'CONDITION' | 'STATEMENT' | 'RETURN' | 'EMPTY' | 'MERGE' | 'FOR_INIT' | 'FOR_CONDITION' | 'FOR_UPDATE' | 'FOR_EXIT' | 'SWITCH_CONDITION' | 'SWITCH_MERGE' | 'CASE_CONDITION';
type EdgeType = "regular" | "consequence" | "alternative";
interface GraphNode {
  type: NodeType;
  code: string;
  lines: number;
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

interface SwitchlikeProps {
  nodeType: NodeType;
  mergeType: NodeType;
  mergeCode: string;
  caseName: string;
  caseFieldName: string;
  caseTypeName: NodeType;
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
    })
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
      labels: this.labels
    }
  }
}



export function mergeNodeAttrs(from: GraphNode, into: GraphNode): GraphNode {
  return {
    type: from.type,
    code: `${from.code}\n${into.code}`,
    lines: from.lines + into.lines,
  };
}

export class CFGBuilder {
  private graph: MultiDirectedGraph<GraphNode, GraphEdge>;
  private entry: string;
  private nodeId: number;

  constructor() {
    this.graph = new MultiDirectedGraph();
    this.nodeId = 0;
    this.entry = null;
  }

  public buildCFG(functionNode: Node): CFG {
    const bodyNode = functionNode.childForFieldName('body');
    if (bodyNode) {
      const blockHandler = new BlockHandler();
      const { entry } = blockHandler.update(this.processStatements(bodyNode.namedChildren));

      blockHandler.processGotos((gotoNode, labelNode) => this.addEdge(gotoNode, labelNode));

      const startNode = this.addNode('START', 'START');
      // `entry` will be non-null for any valid code
      this.addEdge(startNode, entry);
      this.entry = startNode;
    }
    return { graph: this.graph, entry: this.entry };
  }

  private addNode(type: NodeType, code: string, lines: number = 1): string {
    const id = `node${this.nodeId++}`;
    this.graph.addNode(id, { type, code, lines });
    return id;
  }

  private addEdge(source: string, target: string, type: EdgeType = 'regular'): void {
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
    return child ? child.text : '';
  }

  private processBlock(node: Node | null): BasicBlock {
    if (!node) return { entry: null, exit: null };

    switch (node.type) {
      case 'block':
        return this.processStatements(node.namedChildren);
      case 'if_statement':
        return this.processIfStatement(node);
      case 'for_statement':
        return this.processForStatement(node);
      case 'expression_switch_statement':
        return this.processSwitchStatement(node);
      case 'return_statement':
        const returnNode = this.addNode('RETURN', node.text);
        return { entry: returnNode, exit: null };
      case 'break_statement':
        return this.processBreakStatement(node);
      case 'continue_statement':
        return this.processContinueStatement(node);
      case 'labeled_statement':
        return this.processLabeledStatement(node);
      case 'goto_statement':
        return this.processGotoStatement(node);
      case 'type_switch_statement':
        return this.processTypeSwitchStatement(node);
      case 'select_statement':
        return this.processSelectStatement(node);
      default:
        const newNode = this.addNode('STATEMENT', node.text);
        return { entry: newNode, exit: newNode };
    }
  }

  private processSwitchlike(switchlikeSyntax: Parser.SyntaxNode, props: SwitchlikeProps): BasicBlock {
    const { nodeType, mergeType, mergeCode, caseName, caseTypeName, caseFieldName } = props;

    let blockHandler = new BlockHandler();
    const valueNode = this.addNode(
      nodeType,
      this.getChildFieldText(switchlikeSyntax, 'value')
    );
    const mergeNode = this.addNode(mergeType, mergeCode);

    let previous = { node: valueNode, branchType: "regular" as EdgeType };
    switchlikeSyntax.namedChildren
      .filter(child => child.type === caseName)
      .forEach((caseNode) => {
        const caseType = this.getChildFieldText(caseNode, caseFieldName);
        const caseConditionNode = this.addNode(
          caseTypeName,
          caseType
        );

        const caseBlock = blockHandler.update(this.processStatements(
          caseNode.namedChildren.slice(1)
        ));
        if (caseBlock.entry) {
          this.addEdge(caseConditionNode, caseBlock.entry, "consequence");
        }
        if (caseBlock.exit) {
          this.addEdge(caseBlock.exit, mergeNode);
        }

        this.addEdge(previous.node, caseConditionNode, previous.branchType);
        previous = { node: caseConditionNode, branchType: "alternative" }
      });

    let defaultCase = switchlikeSyntax.namedChildren.find(child => child.type === 'default_case');
    if (defaultCase !== undefined) {
      const defaultBlock = blockHandler.update(this.processStatements(defaultCase.namedChildren));
      this.addEdge(previous.node, defaultBlock.entry, previous.branchType);
      this.addEdge(defaultBlock.entry, mergeNode);
    } else {
      this.addEdge(previous.node, mergeNode, previous.branchType);
    }

    blockHandler.forEachBreak((breakNode) => {
      this.addEdge(breakNode, mergeNode);
    })

    return blockHandler.update({ entry: valueNode, exit: mergeNode });
  }

  private processSelectStatement(selectSyntax: Parser.SyntaxNode): BasicBlock {
    return this.processSwitchlike(selectSyntax, {
      caseFieldName: "communication",
      caseName: "communication_case",
      caseTypeName: "COMMUNICATION_CASE",
      mergeCode: "MERGE",
      mergeType: "SELECT_MERGE",
      nodeType: "SELECT",
    });
  }
  private processTypeSwitchStatement(switchSyntax: Parser.SyntaxNode): BasicBlock {
    return this.processSwitchlike(switchSyntax, {
      caseFieldName: "value",
      caseName: "type_case",
      caseTypeName: "TYPE_CASE",
      mergeCode: "MERGE",
      mergeType: "TYPE_SWITCH_MERGE",
      nodeType: "TYPE_SWITCH_VALUE",
    });
  }
  private processSwitchStatement(switchSyntax: Node): BasicBlock {
    return this.processSwitchlike(switchSyntax, {
      caseFieldName: "value",
      caseName: "expression_case",
      caseTypeName: "CASE_CONDITION",
      mergeCode: "MERGE",
      mergeType: "SWITCH_MERGE",
      nodeType: "SWITCH_CONDITION",
    });
  }
  private processGotoStatement(gotoSyntax: Parser.SyntaxNode): BasicBlock {
    let name = gotoSyntax.firstNamedChild.text;
    let gotoNode = this.addNode('GOTO', name);
    return { entry: gotoNode, exit: null, gotos: [{ node: gotoNode, label: name }] }
  }
  private processLabeledStatement(labelSyntax: Parser.SyntaxNode): BasicBlock {
    let blockHandler = new BlockHandler();
    let name = this.getChildFieldText(labelSyntax, "label");
    let labelNode = this.addNode("LABEL", name);
    console.log("label", labelSyntax.namedChildCount);
    const { entry: labeledEntry, exit: labeledExit } = blockHandler.update(this.processBlock(labelSyntax.namedChildren[1]))
    if (labeledEntry) this.addEdge(labelNode, labeledEntry)
    return blockHandler.update({ entry: labelNode, exit: labeledExit, labels: new Map([[name, labelNode]]) });
  }
  private processContinueStatement(continueSyntax: Parser.SyntaxNode): BasicBlock {
    const continueNode = this.addNode("CONTINUE", "CONTINUE");
    return { entry: continueNode, exit: null, continues: [continueNode] };
  }
  private processBreakStatement(breakSyntax: Parser.SyntaxNode): BasicBlock {
    const breakNode = this.addNode("BREAK", "BREAK");
    return { entry: breakNode, exit: null, breaks: [breakNode] };
  }

  private processStatements(statements: Node[]): BasicBlock {
    const blockHandler = new BlockHandler();

    // Ignore comments
    const codeStatements = statements.filter(syntax => syntax.type !== "comment");

    if (codeStatements.length === 0) {
      const emptyNode = this.addNode('EMPTY', 'empty block');
      return { entry: emptyNode, exit: emptyNode };
    }

    let entry: string | null = null;
    let previous: string | null = null;
    for (const statement of codeStatements) {
      const { entry: currentEntry, exit: currentExit } = blockHandler.update(this.processBlock(statement));
      if (!entry) entry = currentEntry;
      if (previous && currentEntry) this.addEdge(previous, currentEntry);
      previous = currentExit;
    }
    return blockHandler.update({ entry, exit: previous })
  }

  private processIfStatement(ifNode: Node, mergeNode: string | null = null): BasicBlock {
    let blockHandler = new BlockHandler();
    const conditionChild = ifNode.childForFieldName('condition');
    const conditionNode = this.addNode(
      'CONDITION',
      conditionChild ? conditionChild.text : 'Unknown condition'
    );

    mergeNode ??= this.addNode('MERGE', 'MERGE');


    const consequenceChild = ifNode.childForFieldName('consequence');

    const { entry: thenEntry, exit: thenExit } = blockHandler.update(this.processBlock(consequenceChild));

    const alternativeChild = ifNode.childForFieldName('alternative');
    const elseIf = alternativeChild?.type === "if_statement"
    const { entry: elseEntry, exit: elseExit } = (() => {
      if (elseIf) {
        return blockHandler.update(this.processIfStatement(alternativeChild, mergeNode));
      } else {
        return blockHandler.update(this.processBlock(alternativeChild));
      }
    })();


    this.addEdge(conditionNode, thenEntry || mergeNode, 'consequence');
    if (thenExit) this.addEdge(thenExit, mergeNode);

    if (elseEntry) {
      this.addEdge(conditionNode, elseEntry, 'alternative');
      if (elseExit && !elseIf) this.addEdge(elseExit, mergeNode);
    } else {
      this.addEdge(conditionNode, mergeNode, 'alternative');
    }

    return blockHandler.update({ entry: conditionNode, exit: mergeNode });
  }

  private processForStatement(forNode: Node): BasicBlock {
    const blockHandler = new BlockHandler();
    console.log("children", forNode.firstNamedChild?.type, forNode.firstChild?.type, forNode.children[1]?.type);
    console.log("named childre", forNode.namedChildren?.map((child) => child.type));
    switch (forNode.namedChildCount) {
      // One child means only loop body, two children means loop head.
      case 1: {
        console.log("Infinite loop");
        const headNode = this.addNode("LOOP_HEAD", "loop head");
        const { entry: bodyEntry, exit: bodyExit } = blockHandler.update(this.processBlock(forNode.firstNamedChild));
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
        const { entry: bodyEntry, exit: bodyExit } = blockHandler.update(this.processBlock(forNode.namedChildren[1]));
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
        throw new Error(`Unsupported for type: ${forNode.firstNamedChild?.type}`)
    }
  }


}