import type { Parser } from "web-tree-sitter";
import { Lookup } from "./ranges";
/**
 * This module provides the facilities for matching code offsets to CFG nodes.
 *
 * As it happens, this is not a straight-forward, 1-to-1 mapping, and requires some care.
 * Generally, AST nodes are converted into CFG nodes, and this mapping is relatively straightforward.
 * However, a lof of the code does not belong to any node in particular,
 * and some mappings need to be changed to make the matching more intuitive.
 *
 * In the following explanation, we'll use "syntax" to refer to AST nodes,
 * and "nodes" to refer to CFG nodes. This matches the code for the most part.
 *
 * To deal with that, we use a multi-level mapping system:
 *
 * 1. Syntax is mapped to nodes
 * 2. Offsets are mapped to syntax.
 *
 * This allows us to separate some concerns, and makes the resulting code a bit easier to read.
 *
 * As the CFG is generated, we add the relevant mappings to a collection.
 * Once CFG creation is complete, we sort the ranges from large to small,
 * and construct a `SimpleRange[]` mapping for them.
 * Note that during construction, no smaller node may overlap more than a single larger node.
 * This matches the hierarchical nature of the AST, and makes our life easier as there are
 * no conflicts to resolve.
 *
 * Once the ranges are created, they can be used to query the node matching a specific offset.
 *
 * In some cases, there is another step (not implemented here).
 * If the graph is simplified, and nodes are collapsed together, the mappings will change.
 * To manage that, nodes contain a `targets` field that holds their name.
 * When two nodes are collaped, the new `targets` fiels will contain both their targets.
 * Generally, we'll remap the nodes using the per-node targets after simplification.
 */

export class NodeMapper {
  private syntaxToNode: Map<Parser.SyntaxNode, string> = new Map();
  private ranges: { start: number; stop: number; value: Parser.SyntaxNode }[] =
    [];

  public linkSyntaxToNode(syntax: Parser.SyntaxNode, node: string) {
    this.syntaxToNode.set(syntax, node);

    this.ranges.push({
      start: syntax.startIndex,
      stop: syntax.endIndex,
      value: syntax,
    });
  }

  public linkOffsetToSyntax(
    from: Parser.SyntaxNode,
    to: Parser.SyntaxNode,
    options?: { reverse?: boolean; includeTo?: boolean; includeFrom?: boolean },
  ) {
    const target = options?.reverse ? from : to;
    const toIndex = options?.includeTo ? to.endIndex : to.startIndex;
    const fromIndex = options?.includeFrom ? from.startIndex : from.endIndex;
    this.addRange(fromIndex, toIndex, target);
  }

  private addRange(start: number, stop: number, syntax: Parser.SyntaxNode) {
    this.ranges.push({ start, stop, value: syntax });
  }

  /**
   *
   * @returns Mapping from syntax-IDs to node names
   */
  private getMapping(): Map<number, string> {
    return new Map(
      [...this.syntaxToNode.entries()].map(([syntax, node]) => [
        syntax.id,
        node,
      ]),
    );
  }

  private buildRanges(
    functionSyntax: Parser.SyntaxNode,
  ): Lookup<Parser.SyntaxNode> {
    const lookup = new Lookup(functionSyntax);
    for (const { start, stop, value } of this.ranges.toSorted(
      (b, a) => a.stop - a.start - (b.stop - b.start),
    )) {
      lookup.add(start, stop, value);
    }
    return lookup;
  }

  public getIndexMapping(functionSyntax: Parser.SyntaxNode): Lookup<string> {
    const syntaxToNode = this.getMapping();
    const ranges = this.buildRanges(functionSyntax);
    return ranges.mapValues(
      (value) => syntaxToNode.get(value.id) ?? "Not found",
    );
  }
}
