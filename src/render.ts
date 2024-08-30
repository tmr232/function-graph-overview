import { MultiDirectedGraph } from "graphology";
import { bfsFromNode } from "graphology-traversal";


function distanceFromEntry(graph: MultiDirectedGraph): Map<any, number> {
    let levels = new Map();

    const firstNode = graph.filterNodes((node) => graph.inDegree(node) == 0)[0];

    bfsFromNode(graph, firstNode, (node, attr, depth) => {
        levels.set(node, depth);
    });

    return levels;
}

export function graphToDot(graph: MultiDirectedGraph, name: string = "Graph"): string {
    let dotContent = `digraph "${name}" {\n    node [shape=box];\n    edge [headport=n tailport=s]\n`;
    let levels = distanceFromEntry(graph);
    graph.forEachNode((node) => {

        // let label = `${node} ${graph.getNodeAttributes(node).type}`
        const label = "";
        //     .replace(/"/g, '\\"')
        //     .replace(/\n/g, "\\n");

        // const label = `${graph.getNodeAttribute(node, "line") || ""}`;
        // label = `${levels.get(node)}`;

        let shape = "box";
        let fillColor = "lightgray";
        let minHeight = 0.2;
        if (graph.inDegree(node) === 0) {
            shape = "invhouse";
            fillColor = "#48AB30";
            minHeight = 0.5;
        } else if (graph.outDegree(node) === 0) {
            shape = "house";
            fillColor = "#AB3030";
            minHeight = 0.5;
        }

        const height = Math.max(graph.getNodeAttribute(node, "lines") * 0.3, minHeight);
        dotContent += `    ${node} [label="${label}" shape="${shape}" fillcolor="${fillColor}" style="filled" height=${height}];\n`;
    });

    graph.forEachEdge((edge, attributes, source, target) => {
        let penwidth = 1;
        let color = "blue";
        switch (attributes.type) {
            case "consequence":
                color = "green";
                break;
            case "alternative":
                color = "red";
                break;
            default:
                color = "blue";
        }
        // if (graph.getNodeAttribute(source, "line") > graph.getNodeAttribute(target, "line")) {
        //     penwidth = 2;
        // }
        if ((levels.get(source) ?? 0) > (levels.get(target) ?? 0)) {
            penwidth = 2;
        }
        dotContent += `    ${source} -> ${target} [penwidth=${penwidth} color=${color}];\n`;
    });

    dotContent += "}";
    return dotContent;
}

type AttrMerger = (nodeAttrs: object, intoAttrs: object) => object;
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
export function simplifyGraph(originalGraph: MultiDirectedGraph, mergeAttrs?: AttrMerger): MultiDirectedGraph {
    let graph = originalGraph.copy();

    let toCollapse: string[][] = graph.mapEdges((edge, attrs, source, target) => {
        if (graph.outDegree(source) === 1 && graph.inDegree(target) === 1) {
            return [source, target];
        }
        return null;
    }).filter(x => x) as string[][];

    // Sort merges based on topological order
    const levels = distanceFromEntry(graph);
    toCollapse.sort((a, b) => (levels.get(a[0]) ?? 0) - (levels.get(b[0]) ?? 0));

    try {
        toCollapse.forEach(([source, target]) => {
            collapseNode(graph, source, target, mergeAttrs);
        });
    } catch (error) {
        console.log(error);
    }

    return graph;
}
