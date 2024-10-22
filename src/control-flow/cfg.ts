import { createCFGBuilder as createCCFGBuilder } from "./cfg-c";
import type { BuilderOptions, CFGBuilder } from "./cfg-defs";
import { createCFGBuilder as createGoCFGBuilder } from "./cfg-go";
import { createCFGBuilder as createPythonCFGBuilder } from "./cfg-python";

const supportedLanguages = ["C", "Go", "Python"] as const
export type Language = typeof supportedLanguages[number];
export function isValidLanguage(language: string): language is Language {
  return (supportedLanguages as readonly string[]).includes(language)
}


export function newCFGBuilder(
  language: Language,
  options: BuilderOptions,
): CFGBuilder {
  switch (language) {
    case "C":
      return createCCFGBuilder(options);
    case "Go":
      return createGoCFGBuilder(options);
    case "Python":
      return createPythonCFGBuilder(options);
  }
}
