import { graphToDot } from "../src/control-flow/render.ts";
import { buildSimpleCFG } from "../src/test/commentTestHandlers.ts";
import { initializeParser } from "../src/test/parser-init.ts";
import treeSitterPython from "../parsers/tree-sitter-python.wasm";
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import Parser from "web-tree-sitter";
const myFunction = `
def f():
    if x:
        pass
`;

export function getFirstFunction(tree: Parser.Tree): Parser.SyntaxNode | null {
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
      functionNode = cursor.currentNode;
      return;
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

const { parser:pythonParser } = await initializeParser(treeSitterPython);

const graphviz = await Graphviz.load();
const tree = pythonParser.parse(myFunction);

const functionSyntax = getFirstFunction(tree);
if (!functionSyntax) process.exit(-1);

const cfg = buildSimpleCFG("Python", functionSyntax)
const dot = graphToDot(cfg);

// const dot = `digraph "" {a -> b}`
const svg = graphviz.dot(dot);


console.log(svg);