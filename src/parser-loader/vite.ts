import { Parser, Language as ParserLanguage } from "web-tree-sitter";
import treeSitterCore from "../../parsers/tree-sitter.wasm?url";
import { type Language, languageDefinitions } from "../control-flow/cfg.ts";

export async function initializeParser(language: Language) {
  await Parser.init({
    locateFile(_scriptName: string, _scriptDirectory: string) {
      return treeSitterCore;
    },
  });
  const parserLanguage = await ParserLanguage.load(
    languageDefinitions[language].wasmPath,
  );
  const parser = new Parser();
  parser.setLanguage(parserLanguage);
  return parser;
}
