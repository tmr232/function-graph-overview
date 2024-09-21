import type Parser from "web-tree-sitter";
/* TODO: It seem that AST-based mapping does not fit with what a user expects.
We need to move to a range-based option, based on offsets in the code.

Here we get some issues, though.
A node should, by default, select its entire range.
But sub-nodes will need to overwrite that.
We need a way to maintain that hierarchy.

Additionally, a line with nothing mapped to it should (probably)
default to the first mapped line below it.

Range-operations aside (I'll probably have to write them all),
we need to somehow resolve the hierarchy.

Some ideas:

1. Sort ranges from longest to shortest, break the long ones apart when overwriting is needed.
    Since the structure is inherently hierarchical, there should be no conflicts.
    We do need to make sure empty lines are mapped to the first non-empty line below them, and not to the function head.
2. Structure CFG creation to map nodes in hierarchical order. This _might_ be possible, but would make it hell to write.


We should also somehow mind the difference between block statements and regular ones.
Something to do with `dispatch.many` and `dispatch.single`?
Because they are important for the line stuff.

## Range data type

I am thinking about using an array, with markers for the START of every range.
So basically. So if we have a range from 1 to the end, it'll be `[{start:1, node:1}]`.
If we later split it, adding a node that ranges from line 4 to 8 (inclusive), we'll get:
`[{start:1, node:1}, {start:4, node:2}, {start:9, node:1}]`.
This makes both lookups and insertions simple.
We can easily achieve this with splicing.
We don't have a pre-written binary-search, but with our data sizes linear search should be ok.
*/

function* parentsUpTo(
  syntax: Parser.SyntaxNode,
  stopBefore: Parser.SyntaxNode,
): Generator<Parser.SyntaxNode> {
  if (syntax.id === stopBefore.id) {
    return;
  }
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
        syntax.type,
        syntax.startPosition.row + 1,
        node,
      ]),
    );
    console.log(
      [...this.propagateInside(functionSyntax).entries()].map(
        ([syntax, node]) => [
          syntax.id,
          syntax.type,
          syntax.startPosition.row + 1,
          node,
        ],
      ),
    );
    return new Map(
      [...this.propagateInside(functionSyntax).entries()].map(
        ([syntax, node]) => [syntax.id, node],
      ),
    );
  }
}
