import { type Format, Graphviz } from "@hpcc-js/wasm-graphviz";
import type Parser from "web-tree-sitter";
import {
  type Language,
  functionNodeTypes,
  newCFGBuilder,
  supportedLanguages,
} from "../control-flow/cfg";
import { type CFG, mergeNodeAttrs } from "../control-flow/cfg-defs";
import { simplifyCFG, trimFor } from "../control-flow/graph-ops";
import { graphToDot } from "../control-flow/render";
import { initializeParser } from "../parser-loader/vite.ts";
import { requirementTests } from "../test/commentTestHandlers";
import type { TestFunction } from "../test/commentTestTypes";
import type { TestFuncRecord } from "../test/commentTestUtils";

export type Parsers = { [language in Language]: Parser };

export async function initializeParsers(): Promise<Parsers> {
  const parsers = [];
  for (const language of supportedLanguages) {
    parsers.push([language, await initializeParser(language)]);
  }
  return Object.fromEntries(parsers);
}

export function getFirstFunction(
  tree: Parser.Tree,
  language: Language,
): Parser.SyntaxNode | null {
  let functionNode: Parser.SyntaxNode | null = null;
  const cursor = tree.walk();
  const visitNode = () => {
    if (functionNodeTypes[language].includes(cursor.nodeType)) {
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
    function: getFirstFunction(tree, record.language) as Parser.SyntaxNode,
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
  const functionSyntax = getFirstFunction(
    tree,
    record.language,
  ) as Parser.SyntaxNode;

  const ast = functionSyntax.toString();

  let cfg: CFG;

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
