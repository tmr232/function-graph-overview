import { Graphviz } from "@hpcc-js/wasm-graphviz";
import type { Parser, Node as SyntaxNode, Tree } from "web-tree-sitter";
import {
  type Language,
  functionNodeTypes,
  supportedLanguages,
} from "../control-flow/cfg";
import { getDefaultColorList } from "../control-flow/colors.ts";
import { initializeParser } from "../parser-loader/vite.ts";
import { requirementTests } from "../test/commentTestHandlers";
import type { TestFunction } from "../test/commentTestTypes";
import type { TestFuncRecord } from "../test/commentTestUtils";
import { type RenderOptions, Renderer } from "./renderer.ts";

export type Parsers = { [language in Language]: Parser };

export async function initializeParsers(): Promise<Parsers> {
  const parsers = [];
  for (const language of supportedLanguages) {
    parsers.push([language, await initializeParser(language)]);
  }
  return Object.fromEntries(parsers);
}

export function getFirstFunction(
  tree: Tree,
  language: Language,
): SyntaxNode | null {
  let functionNode: SyntaxNode | null = null;
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
  if (!tree) {
    throw new Error(`Failed to parse code from ${record}`);
  }
  const testFunc: TestFunction = {
    function: getFirstFunction(tree, record.language) as SyntaxNode,
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

export function processRecord(
  record: TestFuncRecord,
  options: RenderOptions,
): { dot?: string; ast: string; svg?: string; error?: Error } {
  const tree = parsers[record.language].parse(record.code);
  if (!tree) {
    throw new Error(`Failed to parse code from ${record}`);
  }
  const functionSyntax = getFirstFunction(tree, record.language) as SyntaxNode;

  const ast = functionSyntax.toString();

  try {
    const renderer = new Renderer(options, getDefaultColorList(), graphviz);
    const { dot, svg } = renderer.render(
      functionSyntax,
      record.language,
      undefined,
    );

    return { dot, ast, svg };
  } catch (error) {
    return {
      ast,
      error: error instanceof Error ? error : new Error(`${error}`),
    };
  }
}
