import type { Parser } from "web-tree-sitter";
import { type Language, functionNodeTypes } from "../control-flow/cfg.ts";

type FileType = { ext: string; language: Language };

// ADD-LANGUAGES-HERE
export const fileTypes: FileType[] = [
  { ext: "c", language: "C" },
  { ext: "cpp", language: "C++" },
  { ext: "h", language: "C++" },
  { ext: "hh", language: "C++" },
  { ext: "hpp", language: "C++" },
  { ext: "cc", language: "C++" },
  { ext: "py", language: "Python" },
  { ext: "go", language: "Go" },
  { ext: "ts", language: "TypeScript" },
  { ext: "js", language: "TypeScript" },
  { ext: "tsx", language: "TSX" },
  { ext: "jsx", language: "TSX" },
];

const extToLanguage: Map<string, Language> = new Map(
  fileTypes.map(({ ext, language }) => [`.${ext}`, language]),
);

function extname(filename: string): string {
  return `.${filename.split(".").pop() ?? ""}`;
}

export function getLanguage(filename: string): Language {
  const ext = extname(filename).toLowerCase();
  const language = extToLanguage.get(ext);
  if (!language) {
    throw new Error(`Unsupported extension ${ext}`);
  }
  return language;
}

export function makeIterFunctions(
  parsers: { [language in Language]: Parser },
): (code: string, language: Language) => IterableIterator<Parser.SyntaxNode> {
  return function* (
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
  };
}
