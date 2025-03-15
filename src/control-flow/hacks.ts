/**
 * This module contains temporary hacks.
 * This is terrible code that should not exist,
 * but is here to circumvent bugs in other projects.
 *
 * As such, all code here should document the bugs it works around
 * and the PRs or issues that will make it obsolete.
 */
import type { Node } from "web-tree-sitter";

/**
 * Assert that there are no nulls in a value returned from tree-sitter.
 * This can be removed once https://github.com/tree-sitter/tree-sitter/pull/4283 is merged.
 * Also relates to https://github.com/tree-sitter/tree-sitter/discussions/4273
 * @param array
 */
export function treeSitterNoNullNodes(array: (Node | null)[]): Node[] {
  if (array.some((x) => x === null)) {
    throw new Error("tree-sitter API actually had a null in an array!");
  }
  return array as Node[];
}
