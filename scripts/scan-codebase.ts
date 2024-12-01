/**
 * This script allows running the CFG builders on all the functions of a given
 * code base.
 * This can be useful in finding CFG generation bugs.
 *
 * @module
 */
import { parseArgs } from "node:util";
import {
  functionNodeTypes,
  type Language,
  newCFGBuilder,
  supportedLanguages,
} from "../src/control-flow/cfg";
import { Glob } from "bun";
import type Parser from "web-tree-sitter";
import { initializeParser } from "../src/parser-loader/bun.ts";
import * as path from "node:path";

type FileType = { ext: string; language: Language };
const fileTypes: FileType[] = [
  { ext: "c", language: "C" },
  { ext: "cpp", language: "C++" },
  { ext: "h", language: "C++" },
  { ext: "hh", language: "C++" },
  { ext: "hpp", language: "C++" },
  { ext: "cc", language: "C++" },
  { ext: "py", language: "Python" },
  { ext: "go", language: "Go" },
];

const parsers: { [language in Language]: Parser } = Object.fromEntries(
  await (async () => {
    const parsers = [];
    for (const language of supportedLanguages) {
      parsers.push([language, (await initializeParser(language)).parser]);
    }
    return parsers;
  })(),
);

const extToLanguage: Map<string, Language> = new Map(
  fileTypes.map(({ ext, language }) => [`.${ext}`, language]),
);

function getLanguage(filename: string): Language {
  const ext = path.extname(filename).toLowerCase();
  const language = extToLanguage.get(ext);
  if (!language) {
    throw new Error(`Unsupported extension ${ext}`);
  }
  return language;
}

function iterSourceFiles(root: string): IterableIterator<string> {
  const sourceGlob = new Glob(
    `**/*.{${fileTypes.map(({ ext }) => ext).join(",")}}`,
  );
  return sourceGlob.scanSync(root);
}

function* iterFunctions(
  code: string,
  language: Language,
): IterableIterator<Parser.SyntaxNode> {
  const tree = parsers[language].parse(code);

  const cursor = tree.walk();
  function* visitNode(): IterableIterator<Parser.SyntaxNode> {
    if (functionNodeTypes[language].includes(cursor.nodeType)) {
      yield cursor.currentNode;
    }

    if (cursor.gotoFirstChild()) {
      do {
        yield* visitNode();
      } while (cursor.gotoNextSibling());
      cursor.gotoParent();
    }
  }
  yield* visitNode();
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv,
    options: {
      root: {
        type: "string",
      },
    },
    strict: true,
    allowPositionals: true,
  });

  const root = values.root ?? ".";

  for (const filename of iterSourceFiles(root)) {
    const filepath = path.join(root, filename);
    const code = await Bun.file(filepath).text();
    const language = getLanguage(filename);
    for (const func of iterFunctions(code, language)) {
      const builder = newCFGBuilder(language, {});
      const cfg = builder.buildCFG(func);
      console.log(filepath, func.startPosition, cfg.graph.order);
    }
  }
}

await main();
