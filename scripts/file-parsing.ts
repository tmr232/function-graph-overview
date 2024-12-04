import path from "node:path";
import type Parser from "web-tree-sitter";
import {
  type Language,
  functionNodeTypes,
  supportedLanguages,
} from "../src/control-flow/cfg.ts";
import { initializeParser } from "../src/parser-loader/bun.ts";

type FileType = { ext: string; language: Language };

export const fileTypes: FileType[] = [
  { ext: "c", language: "C" },
  { ext: "cpp", language: "C++" },
  { ext: "h", language: "C++" },
  { ext: "hh", language: "C++" },
  { ext: "hpp", language: "C++" },
  { ext: "cc", language: "C++" },
  { ext: "py", language: "Python" },
  { ext: "go", language: "Go" },
];

export const parsers: { [language in Language]: Parser } = Object.fromEntries(
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

export function getLanguage(filename: string): Language {
  const ext = path.extname(filename).toLowerCase();
  const language = extToLanguage.get(ext);
  if (!language) {
    throw new Error(`Unsupported extension ${ext}`);
  }
  return language;
}

export function* iterFunctions(
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
