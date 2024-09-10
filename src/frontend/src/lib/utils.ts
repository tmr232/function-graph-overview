import Parser from "web-tree-sitter";

import treeSitterGo from "../../../../parsers/tree-sitter-go.wasm?url";
import treeSitterC from "../../../../parsers/tree-sitter-c.wasm?url";
import treeSitterCore from "../../../../parsers/tree-sitter.wasm?url";
import type { Language } from "../../../control-flow/cfg";

async function initializeParser(language: Language) {
  await Parser.init({
    locateFile(_scriptName: string, _scriptDirectory: string) {
      return treeSitterCore;
    },
  });
  const parser = new Parser();
  const parserLanguage = await (() => {
    switch (language) {
      case "C":
        return Parser.Language.load(treeSitterC);
      case "Go":
        return Parser.Language.load(treeSitterGo);
    }
  })();
  parser.setLanguage(parserLanguage);
  return parser;
}

export interface Parsers {
  Go: Parser;
  C: Parser;
}
export async function initializeParsers(): Promise<Parsers> {
  return {
    Go: await initializeParser("Go"),
    C: await initializeParser("C"),
  };
}

export function getFirstFunction(tree: Parser.Tree): Parser.SyntaxNode | null {
  let functionNode: Parser.SyntaxNode = null;
  const cursor = tree.walk();

  const funcTypes = [
    // Go
    "function_declaration",
    "method_declaration",
    "func_literal",
    // C
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
