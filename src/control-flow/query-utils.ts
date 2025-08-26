import { Query, type Node as SyntaxNode } from "web-tree-sitter";

/**
 * Extracts the text content of syntax tree nodes captured by a Tree-sitter query.
 *
 * @param func - The syntax node from which to extract the tree.
 * @param query - The Tree-sitter query string to execute.
 * @param tag - The capture tag name to filter by.
 *
 */
export function extractCapturedTextsByTag(
  func: SyntaxNode,
  query: string,
  tag: string,
): string[] {
  const queryObj = new Query(func.tree.language, query);
  const captures = queryObj.captures(func, { maxStartDepth: 1 });
  return captures
    .filter((c) => c.name === tag && c.node.text)
    .map((c) => {
      return c.node.text;
    });
}
