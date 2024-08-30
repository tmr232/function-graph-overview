import { MultiDirectedGraph } from 'graphology';
import Parser from 'web-tree-sitter';

type Node = Parser.SyntaxNode;

type NodeType = 'START' | 'END' | 'CONDITION' | 'STATEMENT' | 'RETURN' | 'EMPTY' | 'MERGE' | 'FOR_INIT' | 'FOR_CONDITION' | 'FOR_UPDATE' | 'FOR_EXIT' | 'SWITCH_CONDITION' | 'SWITCH_MERGE' | 'CASE_CONDITION';
type EdgeType = "regular" | "consequence" | "alternative";
interface GraphNode {
  type: NodeType;
  code: string;
  lines: number;
}

interface GraphEdge {
  type: EdgeType;
}


export function mergeNodeAttrs(from: GraphNode, into: GraphNode): GraphNode {
  return {
    type: from.type,
    code: from.code + "\n" + into.code,
    lines: from.lines + into.lines,
  }
}

export class CFGBuilder {
  private graph: MultiDirectedGraph<GraphNode, GraphEdge>;
  private nodeId: number;

  constructor() {
    this.graph = new MultiDirectedGraph();
    this.nodeId = 0;
  }

  public buildCFG(functionNode: Node): MultiDirectedGraph<GraphNode, GraphEdge> {
    const bodyNode = functionNode.childForFieldName('body');
    if (bodyNode) {
      const { entry, exit } = this.processStatements(bodyNode.namedChildren);
      // Uncomment these lines if you want to add START and END nodes
      // const startNode = this.addNode('START', 'START');
      // const endNode = this.addNode('END', 'END');
      // this.addEdge(startNode, entry);
      // this.addEdge(exit, endNode);
    }
    return this.graph;
  }

  private addNode(type: NodeType, code: string, lines: number = 1): string {
    const id = `node${this.nodeId++}`;
    this.graph.addNode(id, { type, code, lines });
    return id;
  }

  private addEdge(source: string, target: string, type: EdgeType = 'regular'): void {
    if (!this.graph.hasEdge(source, target)) {
      this.graph.addEdge(source, target, { type });
    }
  }

  private getChildFieldText(node: Node, fieldName: string): string {
    const child = node.childForFieldName(fieldName);
    return child ? child.text : '';
  }

  private processBlock(node: Node | null): { entry: string | null; exit: string | null } {
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
      default:
        const newNode = this.addNode('STATEMENT', node.text);
        return { entry: newNode, exit: newNode };
    }
  }

  private processStatements(statements: Node[]): { entry: string | null; exit: string | null } {
    if (statements.length === 0) {
      const emptyNode = this.addNode('EMPTY', 'empty block');
      return { entry: emptyNode, exit: emptyNode };
    }

    let entry: string | null = null;
    let previous: string | null = null;
    for (const statement of statements) {
      const { entry: currentEntry, exit: currentExit } = this.processBlock(statement);
      if (!entry) entry = currentEntry;
      if (previous && currentEntry) this.addEdge(previous, currentEntry);
      previous = currentExit;
    }
    return { entry, exit: previous };
  }

  private processIfStatement(ifNode: Node, mergeNode: string | null = null): { entry: string; exit: string } {
    const conditionChild = ifNode.childForFieldName('condition');
    const conditionNode = this.addNode(
      'CONDITION',
      conditionChild ? conditionChild.text : 'Unknown condition'
    );

    mergeNode ??= this.addNode('MERGE', 'MERGE');


    const consequenceChild = ifNode.childForFieldName('consequence');

    const { entry: thenEntry, exit: thenExit } = this.processBlock(consequenceChild);

    const alternativeChild = ifNode.childForFieldName('alternative');
    const elseIf = alternativeChild?.type === "if_statement"
    const { entry: elseEntry, exit: elseExit } = (() => {
      if (elseIf) {
        return this.processIfStatement(alternativeChild, mergeNode);
      } else {
        return this.processBlock(alternativeChild);
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

    return { entry: conditionNode, exit: mergeNode };
  }

  private processForStatement(forNode: Node): { entry: string; exit: string } {
    const initChild = forNode.childForFieldName('initializer');
    const initNode = this.addNode(
      'FOR_INIT',
      initChild ? initChild.text : 'No initializer'
    );

    const conditionChild = forNode.childForFieldName('condition');
    const conditionNode = this.addNode(
      'FOR_CONDITION',
      conditionChild ? conditionChild.text : 'No condition'
    );

    const bodyChild = forNode.childForFieldName('body');
    const { entry: bodyEntry, exit: bodyExit } = bodyChild
      ? this.processBlock(bodyChild)
      : { entry: null, exit: null };

    const updateChild = forNode.childForFieldName('update');
    const updateNode = this.addNode(
      'FOR_UPDATE',
      updateChild ? updateChild.text : 'No update'
    );

    const exitNode = this.addNode('FOR_EXIT', 'FOR_EXIT');

    this.addEdge(initNode, conditionNode);
    this.addEdge(conditionNode, bodyEntry || updateNode, 'consequence');
    if (bodyExit) this.addEdge(bodyExit, updateNode);
    this.addEdge(updateNode, conditionNode);
    this.addEdge(conditionNode, exitNode, 'alternative');

    return { entry: initNode, exit: exitNode };
  }

  private processSwitchStatement(switchNode: Node): { entry: string; exit: string } {
    const conditionNode = this.addNode(
      'SWITCH_CONDITION',
      this.getChildFieldText(switchNode, 'value')
    );
    const mergeNode = this.addNode('SWITCH_MERGE', 'MERGE');

    let previous = { node: conditionNode, branchType: "regular" as EdgeType };
    switchNode.namedChildren.filter(child => child.type === 'expression_case').forEach((caseNode) => {
      const caseCondition = this.getChildFieldText(caseNode, 'value');
      const caseConditionNode = this.addNode(
        'CASE_CONDITION',
        caseCondition || 'default'
      );



      const caseBlock = this.processStatements(
        caseNode.namedChildren.slice(1)
      );
      if (caseBlock.entry) {
        this.addEdge(caseConditionNode, caseBlock.entry, "consequence");
      }
      if (caseBlock.exit) {
        this.addEdge(caseBlock.exit, mergeNode);
      }

      this.addEdge(previous.node, caseConditionNode, previous.branchType);
      previous = { node: caseConditionNode, branchType: "alternative" }
    });
    let defaultCase = switchNode.namedChildren.find(child => child.type === 'default_case');
    if (defaultCase !== undefined) {
      const defaultBlock = this.processStatements(defaultCase.namedChildren);
      this.addEdge(previous.node, defaultBlock.entry, previous.branchType);
      this.addEdge(defaultBlock.entry, mergeNode);
    } else {
      this.addEdge(previous.node, mergeNode, previous.branchType);
    }

    return { entry: conditionNode, exit: mergeNode };
  }
}