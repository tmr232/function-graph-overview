import type {
  CFGGraph,
  Cluster,
  ClusterId,
  ClusterType,
  EdgeType,
  GraphNode,
  NodeType,
} from "./cfg-defs.ts";
import { MultiDirectedGraph } from "graphology";

export class Builder {
  private graph: CFGGraph = new MultiDirectedGraph();
  private nodeId: number = 0;
  private clusterId: ClusterId = 0;
  private activeClusters: Cluster[] = [];

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

  public withCluster<T>(type: ClusterType, fn: (cluster: Cluster) => T): T {
    const cluster = this.startCluster(type);
    try {
      return fn(cluster);
    } finally {
      this.endCluster(cluster);
    }
  }

  public addNode(
    type: NodeType,
    code: string,
    startOffset: number | null,
  ): string {
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
    });
    return id;
  }

  public cloneNode(node: string, overrides?: { cluster: Cluster }): string {
    const id = `node${this.nodeId++}`;
    const originalAttrs = this.graph.getNodeAttributes(node);
    const nodeAttrs = structuredClone(originalAttrs);
    nodeAttrs.cluster = originalAttrs.cluster;
    Object.assign(nodeAttrs, overrides);
    this.graph.addNode(id, nodeAttrs);
    return id;
  }

  public addMarker(node: string, marker: string) {
    this.graph.getNodeAttributes(node).markers.push(marker);
  }

  public addEdge(
    source: string,
    target: string,
    type: EdgeType = "regular",
  ): void {
    if (!this.graph.hasEdge(source, target)) {
      this.graph.addEdge(source, target, { type });
    }
  }

  public getGraph(): CFGGraph {
    return this.graph;
  }

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
