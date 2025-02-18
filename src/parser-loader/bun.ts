import { Parser } from "web-tree-sitter";
import type { Language } from "../control-flow/cfg.ts";
import { wasmMapping } from "./wasmMapping.ts";

export async function initializeParser(
  language: Language,
): Promise<{ parser: Parser; language: Parser.Language }> {
  await Parser.init();

  const parserLanguage = await Parser.Language.load(wasmMapping[language]);
  const parser = new Parser();
  parser.setLanguage(parserLanguage);
  return { parser, language: parserLanguage };
}
