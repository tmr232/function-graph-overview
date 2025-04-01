import { Parser, Language as TreeSitterLanguage } from "web-tree-sitter";
import { type Language, languageDefinitions } from "../control-flow/cfg.ts";

export async function initializeParser(
  language: Language,
): Promise<{ parser: Parser; language: TreeSitterLanguage }> {
  await Parser.init();

  const parserLanguage = await TreeSitterLanguage.load(
    languageDefinitions[language].wasmPath,
  );
  const parser = new Parser();
  parser.setLanguage(parserLanguage);
  return { parser, language: parserLanguage };
}
