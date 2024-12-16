import treeSitterC from "../../parsers/tree-sitter-c.wasm?url";
import treeSitterCpp from "../../parsers/tree-sitter-cpp.wasm?url";
import treeSitterGo from "../../parsers/tree-sitter-go.wasm?url";
import treeSitterPython from "../../parsers/tree-sitter-python.wasm?url";
import treeSitterTypeScript from "../../parsers/tree-sitter-typescript.wasm?url";
import type { Language } from "../control-flow/cfg.ts";

// ADD-LANGUAGES-HERE
export const wasmMapping: { [language in Language]: string } = {
  C: treeSitterC,
  Go: treeSitterGo,
  Python: treeSitterPython,
  "C++": treeSitterCpp,
  TypeScript: treeSitterTypeScript,
};
