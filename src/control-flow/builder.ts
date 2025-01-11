import { MultiDirectedGraph } from "graphology";
import type {
  CFGGraph,
  Cluster,
  ClusterId,
  ClusterType,
  EdgeType,
  GraphNode,
  NodeType,
  OverlayTag,
} from "./cfg-defs.ts";

/**
 * Constructs the CFG
 */
export class Builder {
  private graph: CFGGraph = new MultiDirectedGraph();
  private nodeId = 0;
  private clusterId: ClusterId = 0;
  private activeClusters: Cluster[] = [];
  private activeOverlay?: OverlayTag = undefined;

  public startOverlay(text: string): OverlayTag {
    this.activeOverlay = {
      text,
      parent: this.activeOverlay,
      depth: this.activeOverlay ? this.activeOverlay.depth + 1 : 0,
    };
    return this.activeOverlay;
  }

  public endOverlay() {
    this.activeOverlay = this.activeOverlay?.parent;
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

  /**
   * Calls the function within the context of a cluster.
   * Clusters are used for representing context managers and exceptions.
   *
   * Clustered can be nested.
   *
   * @param type The type of the cluster.
   * @param fn The function to run in the context of the cluster.
   */
  public withCluster<T>(type: ClusterType, fn: (cluster: Cluster) => T): T {
    const cluster = this.startCluster(type);
    try {
      return fn(cluster);
    } finally {
      this.endCluster(cluster);
    }
  }

  /**
   * Add a node to the CFG
   * @param type
   * @param code
   * @param startOffset The offset in the code for which the node is generated
   */
  public addNode(type: NodeType, code: string, startOffset: number): string {
    const id = `node${this.nodeId++}`;
    const cluster = this.activeClusters[this.activeClusters.length - 1];
    this.graph.addNode(id, {
      type,
      code,
      lines: 1,
      markers: [],
      cluster,
      targets: [id],
      startOffset: startOffset,
      overlayTag: this.activeOverlay,
    });
    return id;
  }

  /**
   * Clones a node.
   *
   * Useful for `finally` blocks, where the "same" node exists in multiple paths.
   *
   * @param node The node to clone
   * @param overrides Node attributes to override
   */
  public cloneNode(node: string, overrides?: { cluster: Cluster }): string {
    const id = `node${this.nodeId++}`;
    const originalAttrs = this.graph.getNodeAttributes(node);
    const nodeAttrs = structuredClone(originalAttrs);
    nodeAttrs.cluster = originalAttrs.cluster;
    Object.assign(nodeAttrs, overrides);
    this.graph.addNode(id, nodeAttrs);
    return id;
  }

  /**
   * Marks a given node.
   *
   * This is currently only used for testing, to denote nodes of interest for
   * reachability tests.
   *
   * @param node The node to mark
   * @param marker The desired marker
   */
  public addMarker(node: string, marker: string) {
    this.graph.getNodeAttributes(node).markers.push(marker);
  }

  /**
   * Adds an edge to the CFG
   * @param source Source node
   * @param target Target node
   * @param type Edge type
   */
  public addEdge(
    source: string,
    target: string,
    type: EdgeType = "regular",
  ): void {
    if (!this.graph.hasEdge(source, target)) {
      this.graph.addEdge(source, target, { type });
    }
  }

  /**
   * Returns the current CFG
   */
  public getGraph(): CFGGraph {
    return this.graph;
  }

  /**
   * Sets node attributes if they are not yet set (make them default to a value).
   * @param node The node to modify
   * @param defaults Attributes to set
   */
  public setDefault(node: string, defaults: Partial<GraphNode>): void {
    this.graph.updateNodeAttributes(node, (existing: GraphNode) => {
      const result = { ...existing };
      for (const [name, value] of Object.entries(defaults)) {
        // @ts-expect-error: typesafety here seems obvious, and making it actually work is a mess.
        result[name] ??= value;
      }
      return result;
    });
  }
}
