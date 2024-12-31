import type Parser from "web-tree-sitter";
import { type Language, supportedLanguages } from "../control-flow/cfg.ts";
import { initializeParser } from "../parser-loader/vite.ts";
import { makeIterFunctions } from "./file-parsing.ts";
export { getLanguage, fileTypes } from "./file-parsing.ts";

let parsers: { [language in Language]: Parser } | undefined;
export async function initParsers() {
  if (parsers) return;
  parsers = Object.fromEntries(
    await (async () => {
      const parsers = [];
      for (const language of supportedLanguages) {
        parsers.push([language, await initializeParser(language)]);
      }
      return parsers;
    })(),
  );
}

export function iterFunctions(
  code: string,
  language: Language,
): IterableIterator<Parser.SyntaxNode> {
  if (!parsers) {
    throw new Error("Must initialize parsers by calling `initParsers()`");
  }
  return makeIterFunctions(parsers)(code, language);
}
