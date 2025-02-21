import type { Language } from "../control-flow/cfg.ts";
import { languageDefinitions } from "../control-flow/cfg.ts";

// ADD-LANGUAGES-HERE
export const wasmMapping: { [language in Language]: string } = {
  C: languageDefinitions.C.wasmPath,
  Go: languageDefinitions.Go.wasmPath,
  Python: languageDefinitions.Python.wasmPath,
  "C++": languageDefinitions["C++"].wasmPath,
  TypeScript: languageDefinitions.TypeScript.wasmPath,
  TSX: languageDefinitions.TSX.wasmPath,
};
