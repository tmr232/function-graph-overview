import type { MultiDirectedGraph } from "graphology";
import type Parser from "web-tree-sitter";
import type { Lookup } from "./ranges";

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
  | "ASSERT_CONDITION"
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
  /** A unique identifier for the cluster. */
  id: ClusterId;
  type: ClusterType;
  /** Clusters can be nested. */
  parent?: Cluster;
  /** How deep are we in the hierarchy?
   * Used for sorting clusters when rendering.
   */
  depth: number;
};

export interface GraphNode {
  /** What type of syntax node are we representing here? */
  type: NodeType;
  /** The actual source-code text for the node.
   * Useful for debugging, but not much else.
   */
  code: string;
  /** The number of lines-of-code the node represents.
   * Used to determine the height of the node when rendering.
   */
  lines: number;
  /** Node markers for reachability testing */
  markers: string[];
  /** The cluster the node resides in, if any. */
  cluster?: Cluster;
  /** All the node IDs represented by this node after simplification. */
  targets: string[];
  /** The source-code offset the syntax represented by the node starts at.
   * This is used for mapping between the graph and the code for navigation.
   */
  startOffset: number;
}

export interface GraphEdge {
  type: EdgeType;
}

/**
 * Represents a `goto` statement.
 */
export interface Goto {
  /**
   * The name of the label to jump to
   */
  label: string;
  /**
   * The node containing the `goto` statement
   */
  node: string;
}

/**
 * The `BasicBlock` is used in the process of building a CFG.
 * It is meant to represent a "statement" or "block" of source-code.
 *
 * It allows us to abstract over individual CFG nodes and work with something
 * that's closer to the source code.
 *
 * `BasicBlocks`s can be nested, just like code structures.
 * If we have a `BasicBlock` representing an `if` statement, it will have
 * `BasicBlock`s for the individual statements nested within it.
 *
 * Each `BasicBlock` can span many CFG nodes.
 */
export interface BasicBlock {
  /**
   * The ID of the entry node.
   */
  entry: string;
  /**
   * Normal exit node, if exists.
   *
   * This would be the next statement after the current one in the source code.
   * For control-flow statements (like `return`, `break`, etc.) we won't have
   * an `exit`, as the control-flow doesn't reach it.
   * Similarly, blocks ending with a flow-altering statement won't have an exit.
   */
  exit: string | null;
  /**
   * The active `continue` nodes within this block.
   *
   * A `continue` is active if it's target is outside the current block.
   */
  continues?: ExitStatement[];
  /**
   * The active `break` nodes within this block.
   */
  breaks?: ExitStatement[];
  /**
   * All the labels within this block.
   *
   * The mapping is from the label's name to the labeled node.
   */
  labels?: Map<string, string>;
  /**
   * All the active `goto`s within this block.
   *
   * Active `goto`s are one that were not yet resolved.
   */
  gotos?: Goto[];
  /**
   * All the `return` statements within the block.
   * As the CFG is a single-function graph, `return` statements are never
   * resolved within it.
   */
  returns?: string[];
}

export type CFGGraph = MultiDirectedGraph<GraphNode, GraphEdge>;

/**
 * The full CFG structure.
 */
export interface CFG {
  /**
   * The graph itself
   */
  graph: CFGGraph;
  /**
   * The function's entry node
   */
  entry: string;
  /**
   * A mapping between source-code offsets and their matching CFG nodes
   */
  offsetToNode: Lookup<string>;
}

/**
 * Represents a `break` or a `continue` statement.
 */
export type ExitStatement = {
  /**
   * The node we jump from
   */
  from: string;
  /**
   * The label we jump to, if one exists
   */
  label?: string;
};

export class BlockHandler {
  private breaks: ExitStatement[] = [];
  private continues: ExitStatement[] = [];
  private labels: Map<string, string> = new Map();
  private gotos: Array<Goto> = [];
  /**
   * All the returns encountered so far.
   *
   * This is needed for `finally` clauses in exception handling,
   * as the return is moved/duplicated to the end of the finally-clause.
   * This means that when processing returns, we expect to get a new set
   * of returns.
   */
  private returns: Array<string> = [];

  private shouldHandle(label?: string): (stmt: ExitStatement) => boolean {
    return (stmt: ExitStatement) => {
      // A break/continue without a label matches any relevant statement.
      if (!stmt.label) {
        return true;
      }
      // A break/continue with a label matches only the correct label.
      return stmt.label === label;
    };
  }

  /**
   * Operate on all collected breaks and clear them.
   * @param callback Handles the breaks, linking them to the relevant nodes.
   * @param label If exists, include breaks matching the label
   */
  public forEachBreak(callback: (breakNode: string) => void, label?: string) {
    const matchingBreaks = this.breaks.filter(this.shouldHandle(label));
    const unhandledBreaks = this.breaks.filter(
      (e) => !this.shouldHandle(label)(e),
    );

    for (const { from } of matchingBreaks) {
      callback(from);
    }
    this.breaks = unhandledBreaks;
  }

  public forEachContinue(
    callback: (continueNode: string) => void,
    label?: string,
  ) {
    const matchingContinues = this.continues.filter(this.shouldHandle(label));
    const unhandledContinues = this.continues.filter(
      (e) => !this.shouldHandle(label)(e),
    );

    for (const { from } of matchingContinues) {
      callback(from);
    }
    this.continues = unhandledContinues;
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
  const noMergeTypes: Set<NodeType> = new Set(["YIELD", "THROW"]);
  if (noMergeTypes.has(from.type) || noMergeTypes.has(into.type)) {
    return null;
  }

  const startOffset = Math.min(from.startOffset, into.startOffset);

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

export function getNodeRemapper(cfg: CFG): (node: string) => string {
  const remap = new Map<string, string>();
  cfg.graph.forEachNode((node, { targets }) => {
    for (const target of targets) {
      remap.set(target, node);
    }
  });
  return (node) => remap.get(node) ?? node;
}

/**
 * Nodes are changes during simplification, and we need to remap them to match.
 * @param cfg
 */
export function remapNodeTargets(cfg: CFG): CFG {
  const remapper = getNodeRemapper(cfg);
  const offsetToNode = cfg.offsetToNode.mapValues(remapper);

  // Copying the graph is needed.
  // Seems that some of the graph properties don't survive the structured clone.
  const graph = cfg.graph.copy();
  return { entry: cfg.entry, graph, offsetToNode };
}
