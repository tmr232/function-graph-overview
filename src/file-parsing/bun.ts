import type Parser from "web-tree-sitter";
import { type Language, supportedLanguages } from "../control-flow/cfg.ts";
import { initializeParser } from "../parser-loader/bun.ts";
import { makeIterFunctions } from "./file-parsing.ts";
export { getLanguage, fileTypes } from "./file-parsing.ts";

const parsers: { [language in Language]: Parser } = Object.fromEntries(
  await (async () => {
    const parsers = [];
    for (const language of supportedLanguages) {
      parsers.push([language, (await initializeParser(language)).parser]);
    }
    return parsers;
  })(),
);

export const iterFunctions = makeIterFunctions(parsers);
