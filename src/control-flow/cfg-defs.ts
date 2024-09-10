import { MultiDirectedGraph } from "graphology";
import type Parser from "web-tree-sitter";

export type NodeType =
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
export type EdgeType = "regular" | "consequence" | "alternative";
export interface GraphNode {
  type: NodeType;
  code: string;
  lines: number;
  markers: string[];
}

export interface GraphEdge {
  type: EdgeType;
}

export interface Goto {
  label: string;
  node: string;
}

export interface BasicBlock {
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

export class BlockHandler {
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
    markers: [...from.markers, ...into.markers],
  };
}
export interface Case {
  conditionEntry: string | null;
  conditionExit: string | null;
  consequenceEntry: string | null;
  consequenceExit: string | null;
  alternativeExit: string;
  hasFallthrough: boolean;
  isDefault: boolean;
}

export interface BuilderOptions {
  flatSwitch?: boolean;
  markerPattern?: RegExp;
}

export interface CFGBuilder {
  buildCFG(functionSyntax: Parser.SyntaxNode): CFG;
}
