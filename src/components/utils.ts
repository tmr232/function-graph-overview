import Parser from "web-tree-sitter";

import treeSitterGo from "../../parsers/tree-sitter-go.wasm?url";
import treeSitterC from "../../parsers/tree-sitter-c.wasm?url";
import treeSitterPython from "../../parsers/tree-sitter-python.wasm?url";
import treeSitterCore from "../../parsers/tree-sitter.wasm?url";
import treeSitterCpp from "../../parsers/tree-sitter-cpp.wasm?url";
import { newCFGBuilder, type Language } from "../control-flow/cfg";
import type { TestFuncRecord } from "../test/commentTestUtils";
import type { TestFunction } from "../test/commentTestTypes";
import { requirementTests } from "../test/commentTestHandlers";
import { simplifyCFG, trimFor } from "../control-flow/graph-ops";
import { mergeNodeAttrs } from "../control-flow/cfg-defs";
import { graphToDot } from "../control-flow/render";
import { Graphviz, type Format } from "@hpcc-js/wasm-graphviz";
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
      case "Python":
        return Parser.Language.load(treeSitterPython);
      case "C++":
        return Parser.Language.load(treeSitterCpp)
    }
  })();
  parser.setLanguage(parserLanguage);
  return parser;
}

export interface Parsers {
  Go: Parser;
  C: Parser;
  Python: Parser;
  "C++":Parser;
}
export async function initializeParsers(): Promise<Parsers> {
  return {
    Go: await initializeParser("Go"),
    C: await initializeParser("C"),
    Python: await initializeParser("Python"),
    "C++": await initializeParser("C++")
  };
}

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

let parsers: Parsers;
let graphviz: Graphviz;
export async function initialize() {
  parsers = await initializeParsers();
  graphviz = await Graphviz.load();
  return { parsers, graphviz };
}
export interface TestResults {
  reqName: string;
  reqValue: unknown;
  failure: string | null;
}

export function runTest(record: TestFuncRecord): TestResults[] {
  const tree = parsers[record.language].parse(record.code);
  const testFunc: TestFunction = {
    function: getFirstFunction(tree) as Parser.SyntaxNode,
    language: record.language,
    name: record.name,
    reqs: record.reqs,
  };
  const testResults = [];
  for (const [key, value] of Object.entries(testFunc.reqs)) {
    const reqHandler = requirementTests[key];
    if (!reqHandler) {
      continue;
    }
    testResults.push({
      reqName: key,
      reqValue: value,
      failure: reqHandler(testFunc),
    });
  }
  return testResults;
}
export interface RenderOptions {
  readonly simplify: boolean;
  readonly verbose: boolean;
  readonly trim: boolean;
  readonly flatSwitch: boolean;
}

export function processRecord(
  record: TestFuncRecord,
  options: RenderOptions,
): { dot?: string; ast: string; svg?: string; error?: Error } {
  const { trim, simplify, verbose, flatSwitch } = options;
  const tree = parsers[record.language].parse(record.code);
  const builder = newCFGBuilder(record.language, { flatSwitch });
  const functionSyntax = getFirstFunction(tree) as Parser.SyntaxNode;

  const ast = functionSyntax.toString();

  let cfg;

  try {
    cfg = builder.buildCFG(functionSyntax);
  } catch (error) {
    return {
      ast,
      error: error instanceof Error ? error : new Error(`${error}`),
    };
  }

  if (trim) cfg = trimFor(cfg);
  if (simplify) cfg = simplifyCFG(cfg, mergeNodeAttrs);
  const rawDot = graphToDot(cfg, verbose);
  const dot = graphviz.dot(rawDot, "canon" as Format);
  const svg = graphviz.dot(dot);

  return { dot, ast, svg };
}
