import { Query, type Node as SyntaxNode } from "web-tree-sitter";

/**
 * Extracts the text content of syntax tree nodes captured by a Tree-sitter query.
 *
 * @param node - The syntax node from which to extract the tree.
 * @param query - The Tree-sitter query string to execute.
 * @param captureName  - The capture tag name to filter by.
 *
 */
export function extractCapturedTextsByCaptureName(
  node: SyntaxNode,
  query: string,
  captureName: string,
): string[] {
  const queryObj = new Query(node.tree.language, query);
  const captures = queryObj.captures(node, { maxStartDepth: 1 });
  return captures
    .filter((c) => c.name === captureName && c.node.text)
    .map((c) => {
      return c.node.text;
    });
}
