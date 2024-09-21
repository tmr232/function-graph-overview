import type Parser from "web-tree-sitter";

function* parentsUpTo(
  syntax: Parser.SyntaxNode,
  stopBefore: Parser.SyntaxNode,
): Generator<Parser.SyntaxNode> {
  let current = syntax.parent;
  if (
    stopBefore.startIndex > syntax.startIndex ||
    stopBefore.endIndex < syntax.endIndex
  ) {
    throw new Error("Must be a parent!");
  }
  for (; current && current.id !== stopBefore.id; current = current.parent) {
    yield current;
  }
  if (current?.id !== stopBefore.id) {
    throw new Error(`stopAt must be a parent of the input`);
  }
}

export class NodeMapper {
  private syntaxToNode: Map<Parser.SyntaxNode, string> = new Map();
  public add(syntax: Parser.SyntaxNode, node: string) {
    this.syntaxToNode.set(syntax, node);
  }
  private propagateInside(
    container: Parser.SyntaxNode,
  ): Map<Parser.SyntaxNode, string> {
    const mappedIds = new Set(
      [...this.syntaxToNode.keys()].map((syntax) => syntax.id),
    );
    const propagated: [Parser.SyntaxNode, string][] = [];
    for (const [syntax, node] of this.syntaxToNode.entries()) {
      for (const parent of parentsUpTo(syntax, container)) {
        // If the parent is already mapped, we stop propagation.
        if (mappedIds.has(parent.id)) break;
        // Otherwise, we map it to the current node.
        propagated.push([parent, node]);
      }
    }
    return new Map([...this.syntaxToNode.entries(), ...propagated]);
  }
  public getMapping(functionSyntax: Parser.SyntaxNode): Map<number, string> {
    console.log(
      [...this.syntaxToNode.entries()].map(([syntax, node]) => [
        syntax.id,
        node,
      ]),
    );
    console.log(
      [...this.propagateInside(functionSyntax).entries()].map(
        ([syntax, node]) => [syntax.id, node],
      ),
    );
    return new Map(
      [...this.propagateInside(functionSyntax).entries()].map(
        ([syntax, node]) => [syntax.id, node],
      ),
    );
  }
}
