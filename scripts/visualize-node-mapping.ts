import { parseArgs } from "util";
import { newCFGBuilder } from "../src/control-flow/cfg";
import { simplifyCFG, trimFor } from "../src/control-flow/graph-ops";
import { initializeParsers } from "../src/frontend/src/lib/utils";
import type Parser from "web-tree-sitter";
import type { CFG } from "../src/control-flow/cfg-defs";
import { evolve } from "../src/control-flow/evolve";
import { iterRanges } from "../src/control-flow/ranges";


export function getNamedFunction(tree: Parser.Tree, name: string): Parser.SyntaxNode | null {
    let functionNode: Parser.SyntaxNode | null = null;
    const cursor = tree.walk();

    const funcTypes = [
        // Go
        "function_declaration",
        "method_declaration",
        "func_literal",
        // C, Python
        "function_definition",
    ];

    const visitNode = () => {
        if (funcTypes.includes(cursor.nodeType)) {
            if (cursor.currentNode.childForFieldName("name")?.text === name) {
                functionNode = cursor.currentNode;
                return;
            }
        }

        if (cursor.gotoFirstChild()) {
            do {
                visitNode();
            } while (cursor.gotoNextSibling());
            cursor.gotoParent();
        }
    };

    visitNode();
    return functionNode;
}

function remapNodeTargets(cfg: CFG): CFG {
    const remap = new Map<string, string>();
    cfg.graph.forEachNode((node, { targets }) => {
        targets.forEach((target) => remap.set(target, node));
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


async function main() {
    const { values } = parseArgs({
        args: Bun.argv,
        options: {
            file: {
                type: "string",
            },
            func: {
                type: "string"
            }
        },
        strict: true,
        allowPositionals: true,
    });

    if (!values.file || !values.func) {
        return;
    }

    const sourceFile = Bun.file(values.file);
    const sourceText = await sourceFile.text()

    const pythonParser = (await initializeParsers()).Python;
    const tree = pythonParser.parse(sourceText);
    const functionSyntax = getNamedFunction(tree, values.func);

    if (!functionSyntax) {
        return
    }

    const cfgBuilder = newCFGBuilder("Python", {});
    const cfg = remapNodeTargets(simplifyCFG(trimFor(cfgBuilder.buildCFG(functionSyntax))))

    const nodes = new Set(cfg.offsetToNode.map(({ value }) => value));
    const nodeColors = new Map([...nodes.keys()].map((node, i, { length }) => [node, `hsl(${360 * i / length}deg 60% 60%)`]));

    let result = '';
    const funcStart = functionSyntax.startIndex;
    const funcEnd = functionSyntax.endIndex;
    for (const { start, stop, value: node } of iterRanges(cfg.offsetToNode)) {
        if (((stop ?? 0) < funcStart) || start > funcEnd) {
            continue;
        }
        result += `<span style="background: ${nodeColors.get(node) ?? "red"};">${sourceText.slice(Math.max(start, funcStart), Math.min(funcEnd, stop ?? sourceText.length))}</span>`
    }
    console.log(cfg.offsetToNode)
    console.log(`<html><body><pre>${result}</pre></body></html>`);
}


await main();