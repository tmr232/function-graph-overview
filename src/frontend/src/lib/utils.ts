import Parser from "web-tree-sitter";

import treeSitterGo from "../../../../parsers/tree-sitter-go.wasm?url";
import treeSitterCore from "../../../../parsers/tree-sitter.wasm?url";

export async function initializeParser() {
  await Parser.init({
    locateFile(scriptName: string, scriptDirectory: string) {
      return treeSitterCore;
    },
  });
  const parser = new Parser();
  const Go = await Parser.Language.load(treeSitterGo);
  parser.setLanguage(Go);
  return parser;
}

export function getFirstFunction(tree: Parser.Tree): Parser.SyntaxNode | null {
  let functionNode: Parser.SyntaxNode = null;
  const cursor = tree.walk();

  const funcTypes = [
    "function_declaration",
    "method_declaration",
    "func_literal",
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
