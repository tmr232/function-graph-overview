import type { MultiDirectedGraph } from "graphology";
import type Parser from "web-tree-sitter";
import { evolve } from "./evolve";
import type { SimpleRange } from "./ranges";

export type NodeType =
  | "YIELD"
  | "THROW"
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
export type EdgeType = "regular" | "consequence" | "alternative" | "exception";

export type ClusterType =
  | "with"
  | "try"
  | "except"
  | "else"
  | "finally"
  | "try-complex";
export type ClusterId = number;
export type Cluster = {
  id: ClusterId;
  type: ClusterType;
  parent?: Cluster;
  depth: number;
};

export interface GraphNode {
  type: NodeType;
  code: string;
  lines: number;
  markers: string[];
  cluster?: Cluster;
  targets: string[];
  startOffset: number | null;
}

export interface GraphEdge {
  type: EdgeType;
}

export interface Goto {
  label: string;
  node: string;
}

export interface BasicBlock {
  entry: string;
  exit: string | null;
  continues?: string[];
  breaks?: string[];
  // From label name to node
  labels?: Map<string, string>;
  // Target label
  gotos?: Goto[];
  // Return statements in the block. Needed for exception handling.
  returns?: string[];
}

export type CFGGraph = MultiDirectedGraph<GraphNode, GraphEdge>;
export interface CFG {
  graph: CFGGraph;
  entry: string;
  offsetToNode: SimpleRange<string>[];
}

export class BlockHandler {
  private breaks: string[] = [];
  private continues: string[] = [];
  private labels: Map<string, string> = new Map();
  private gotos: Array<{ label: string; node: string }> = [];
  /**
   * All the returns encountered so far.
   *
   * This is needed for `finally` clauses in exception handling,
   * as the return is moved/duplicated to the end of the finally clause.
   * This means that when processing returns, we expect to get a new set
   * of returns.
   */
  private returns: Array<string> = [];

  /**
   * Operate on all collected breaks and clear them.
   * @param callback Handles the breaks, linking them to the relevant nodes.
   */
  public forEachBreak(callback: (breakNode: string) => void) {
    this.breaks.forEach(callback);
    this.breaks = [];
  }

  public forEachContinue(callback: (continueNode: string) => void) {
    this.continues.forEach(callback);
    this.continues = [];
  }

  public forEachReturn(callback: (returnNode: string) => string) {
    this.returns = this.returns.map(callback);
  }

  public processGotos(callback: (gotoNode: string, labelNode: string) => void) {
    for (const goto of this.gotos) {
      const labelNode = this.labels.get(goto.label);
      if (labelNode) {
        callback(goto.node, labelNode);
      }
      // If we get here, then the goto didn't have a matching label.
      // This is a user problem, not graphing problem.
    }
  }

  public update(block: BasicBlock): BasicBlock {
    this.breaks.push(...(block.breaks ?? []));
    this.continues.push(...(block.continues ?? []));
    this.gotos.push(...(block.gotos ?? []));
    this.returns.push(...(block.returns ?? []));
    block.labels?.forEach((value, key) => this.labels.set(key, value));

    return {
      entry: block.entry,
      exit: block.exit,
      breaks: this.breaks,
      continues: this.continues,
      gotos: this.gotos,
      labels: this.labels,
      returns: this.returns,
    };
  }
}

export function mergeNodeAttrs(
  from: GraphNode,
  into: GraphNode,
): GraphNode | null {
  if (from.cluster !== into.cluster) {
    return null;
  }
  const noMergeTypes: NodeType[] = ["YIELD", "THROW"];
  if (noMergeTypes.includes(from.type) || noMergeTypes.includes(into.type)) {
    return null;
  }

  const startOffset = (() => {
    if (from.startOffset === null || into.startOffset === null) {
      return from.startOffset ?? into.startOffset;
    }
    return Math.min(from.startOffset, into.startOffset);
  })();

  return {
    type: from.type,
    code: `${from.code}\n${into.code}`,
    lines: from.lines + into.lines,
    markers: [...from.markers, ...into.markers],
    cluster: from.cluster,
    targets: [...from.targets, ...into.targets],
    startOffset: startOffset,
  };
}
export interface Case {
  conditionEntry: string;
  conditionExit: string;
  consequenceEntry: string;
  consequenceExit: string | null;
  alternativeExit: string;
  hasFallthrough: boolean;
  isDefault: boolean;
}

export interface BuilderOptions {
  /**
   * Render switches as flat, vs. an if-else chain
   */
  flatSwitch?: boolean;
  /**
   * The comment pattern to use for markers.
   * The first capture group will be used as the marker text.
   */
  markerPattern?: RegExp;
}

export interface CFGBuilder {
  buildCFG(functionSyntax: Parser.SyntaxNode): CFG;
}

/**
 * Nodes are changes during simplification, and we need to remap them to match.
 * @param cfg
 */
export function remapNodeTargets(cfg: CFG): CFG {
  const remap = new Map<string, string>();
  cfg.graph.forEachNode((node, { targets }) => {
    for (const target of targets) {
      remap.set(target, node);
    }
  });
  const offsetToNode = cfg.offsetToNode.map(({ start, value: node }) => ({
    start,
    value: remap.get(node) ?? node,
  }));

  // Copying the graph is needed.
  // Seems that some of the graph properties don't survive the structured clone.
  const graph = cfg.graph.copy();
  return evolve(cfg, { graph, offsetToNode });
}
