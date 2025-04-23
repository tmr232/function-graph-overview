import path from "node:path";
import { Parser, Language as TreeSitterLanguage } from "web-tree-sitter";
import { type Language, languageDefinitions } from "../control-flow/cfg.ts";
export async function initializeParser(
  language: Language,
): Promise<{ parser: Parser; language: TreeSitterLanguage }> {
  await Parser.init();
  let wasmPath = languageDefinitions[language].wasmPath;
  if (process.env.VITEST !== undefined) {
    // We're running vitest under node, so things are slightly different.
    wasmPath = path.join(process.cwd(), wasmPath);
  }
  const parserLanguage = await TreeSitterLanguage.load(wasmPath);
  const parser = new Parser();
  parser.setLanguage(parserLanguage);
  return { parser, language: parserLanguage };
}
