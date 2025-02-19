/**
 * @category Testing
 * @module
 */
import type Parser from "web-tree-sitter";
import type { Language } from "../control-flow/cfg";

export interface Requirements {
  /**
   * Number of nodes expected in the CFG (simplified, if-chain switch)
   */
  nodes?: number;
  /**
   * Number of nodes expected in the CFG (simplified, flat switch)
   */
  flatNodes?: number;
  /**
   * Number of exit nodes expected in the CFG
   */
  exits?: number;
  /**
   * [source, target] pairs to assert reachability in the CFG
   *
   * Nodes need to be marked with a comment, containing `CFG: ` followed
   * by the marker to use in the test.
   */
  reaches?: [string, string][];
  /**
   * [source, target] pairs to assert un-reachability in the CFG
   *
   * Nodes need to be marked with a comment, containing `CFG: ` followed
   * by the marker to use in the test.
   */
  unreach?: [string, string][];
  /**
   * Require rendering to succeed for this test.
   *
   * This is mostly useful when debugging rendering errors.
   */
  render?: boolean;
}

export interface TestFunction {
  /**
   * The name of the test function
   */
  name: string;
  /**
   * The function's AST
   */
  function: Parser.SyntaxNode;
  /**
   * The requirements defined in the comment
   */
  reqs: Requirements;
  /**
   * The code language
   */
  language: Language;
}
