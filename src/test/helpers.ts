import { initializeParser } from "../parser-loader/bun.ts";
import type { Parser, Language as TreeSitterLanguage } from "web-tree-sitter";
import type { Language } from "../control-flow/cfg.ts";

const parsers:Record<Language,{parser:Parser, language:TreeSitterLanguage} > = {
  TSX: await initializeParser("TSX"),
  TypeScript:  await initializeParser("TypeScript"),
  "C++": await initializeParser("C++"),
  Python: await initializeParser("Python"),
  Go: await initializeParser("Go"),
  C: await initializeParser("C"),
}

export default parsers;