import type Parser from "web-tree-sitter";
import type { Language as CFGLanguage } from "../control-flow/cfg";
export interface Requirements {
  nodes?: number;
  exits?: number;
  reaches?: [string, string][];
  render?: boolean;
}
export interface TestFunction {
  name: string;
  function: Parser.SyntaxNode;
  reqs: Requirements;
  language: CFGLanguage;
}
