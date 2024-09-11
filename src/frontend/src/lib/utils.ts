import Parser from "web-tree-sitter";

import treeSitterGo from "../../../../parsers/tree-sitter-go.wasm?url";
import treeSitterC from "../../../../parsers/tree-sitter-c.wasm?url";
import treeSitterCore from "../../../../parsers/tree-sitter.wasm?url";
import { newCFGBuilder, type Language } from "../../../control-flow/cfg";
import type { TestFuncRecord } from "../../../test/commentTestUtils";
import type { TestFunction } from "../../../test/commentTestTypes";
import { requirementTests } from "../../../test/commentTestHandlers";
import { simplifyCFG, trimFor } from "../../../control-flow/graph-ops";
import { mergeNodeAttrs } from "../../../control-flow/cfg-defs";
import { graphToDot } from "../../../control-flow/render";
import { Graphviz } from "@hpcc-js/wasm-graphviz";
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

const parsers: Parsers = await initializeParsers();
const graphviz: Graphviz = await Graphviz.load();
interface TestResults {
  reqName: string; reqValue: any; failure: string | null;
}
export function runTest(record: TestFuncRecord): TestResults[] {
  const tree = parsers[record.language].parse(record.code);
  const testFunc: TestFunction = {
    function: getFirstFunction(tree),
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
): { dot: string, ast: string, testResults: TestResults[], failed: boolean, svg: string } | null {
  const { trim, simplify, verbose, flatSwitch } = options;
  const tree = parsers[record.language].parse(record.code);
  const functionSyntax = getFirstFunction(tree);
  const builder = newCFGBuilder(record.language, { flatSwitch });

  let cfg = builder.buildCFG(functionSyntax);

  if (!cfg) return null;
  if (trim) cfg = trimFor(cfg);
  if (simplify) cfg = simplifyCFG(cfg, mergeNodeAttrs);

  const dot = graphToDot(cfg, verbose);
  const ast = functionSyntax.toString();
  const svg = graphviz.dot(dot);

  const testResults = runTest(record);
  const failed = !!testResults.filter((result) => result.failure).length;

  return { dot, ast, testResults, failed, svg }
}