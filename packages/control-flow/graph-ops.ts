import { MultiDirectedGraph } from "graphology";
import { subgraph } from "graphology-operators";
import { bfsFromNode } from "graphology-traversal";
import type { CFG } from "./cfg";

export function distanceFromEntry(cfg: CFG): Map<any, number> {
    const { graph, entry } = cfg;
    let levels = new Map();

    bfsFromNode(graph, entry, (node, attr, depth) => {
        levels.set(node, depth);
    });

    return levels;
}

export type AttrMerger = (nodeAttrs: object, intoAttrs: object) => object;
function collapseNode(graph: MultiDirectedGraph, node: any, into: any, mergeAttrs?: AttrMerger) {
    graph.forEachEdge(node, (edge, attributes, source, target) => {
        if ([source, target].includes(into)) {
            return;
        }

        const replaceNode = (n: any) => (n === node ? into : n);
        let edgeNodes = [replaceNode(source), replaceNode(target)] as const;
        graph.addEdge(...edgeNodes, attributes);
    })
    if (mergeAttrs) {
        const attrs = mergeAttrs(graph.getNodeAttributes(node), graph.getNodeAttributes(into))
        for (const [name, value] of Object.entries(attrs)) {
            graph.setNodeAttribute(into, name, value);
        }
    }
    graph.dropNode(node);
}
/**
 * 
 * @param graph The graph to simplify
 */
export function simplifyCFG(cfg: CFG, mergeAttrs?: AttrMerger): CFG {
    let graph = cfg.graph.copy();

    let toCollapse: string[][] = graph.mapEdges((edge, attrs, source, target) => {
        if (graph.outDegree(source) === 1 && graph.inDegree(target) === 1) {
            return [source, target];
        }
        return null;
    }).filter(x => x) as string[][];

    // Sort merges based on topological order
    const levels = distanceFromEntry(cfg);
    toCollapse.sort((a, b) => (levels.get(a[0]) ?? 0) - (levels.get(b[0]) ?? 0));

    let entry = cfg.entry;

    try {
        toCollapse.forEach(([source, target]) => {
            collapseNode(graph, source, target, mergeAttrs);
            if (entry === source) {
                // Keep track of the entry node!
                entry = target;
            }
        });
    } catch (error) {
        console.log(error);
    }

    return { graph, entry };
}


export function trimFor(cfg: CFG): CFG {
    const { graph, entry } = cfg;
    let reachable: any[] = [];

    bfsFromNode(graph, entry, (node) => { reachable.push(node); });

    return { graph: subgraph(graph, reachable), entry };
}