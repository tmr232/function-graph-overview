import { Parser } from "web-tree-sitter";
import treeSitterCore from "../../parsers/tree-sitter.wasm?url";
import type { Language } from "../control-flow/cfg.ts";
import { wasmMapping } from "./wasmMapping.ts";

export async function initializeParser(language: Language) {
  await Parser.init({
    locateFile(_scriptName: string, _scriptDirectory: string) {
      return treeSitterCore;
    },
  });
  const parserLanguage = await Parser.Language.load(wasmMapping[language]);
  const parser = new Parser();
  parser.setLanguage(parserLanguage);
  return parser;
}
