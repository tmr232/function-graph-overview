import { Query, type Node as SyntaxNode } from "web-tree-sitter";

/**
 * ********************Will probably be removed.********************
 *
 * Extracts the name of a node by searching for a child node with a specific type.
 *
 * @param func - The syntax node to search within.
 * @param type - The type of the child node to extract the name from.
 *
 * used among all languages (mostly the easy cases of extracting the name).
 *
 */
export function extractNameByNodeType(
  func: SyntaxNode,
  type: string,
): string | undefined {
  return func.namedChildren.find((child) => child?.type === type)?.text;
}

/**
 * Extract a single tagged value from a syntax tree using a Tree-sitter query.
 *
 * @param func - The syntax node from which to extract the tree.
 * @param query - The Tree-sitter query string to execute.
 * @param tag - The capture tag name to filter by.
 */
export function extractTaggedValueFromTreeSitterQuery(
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
