import type Parser from "web-tree-sitter";
import { inplaceAddRange, newRanges, type SimpleRange } from "./ranges";
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
/*
TODO: This would probably requrie a second pass on the AST.
I think I'll have to go with multiple passes.

The CFG pass builds the CFG and maps syntax-nodes to CFG-nodes.
This is necessary and we can't do without teh syntax-cfg mapping.

The second pass will build mapping between text positions to syntax nodes.
This _can_ be done in the same pass, but is generally code with different concerns.
This does impose _some_ requirements on the CFG code, as the syntax-nodes we map to
must be mapped to CFG-nodes for things to work.
But the CFG creation is responsible for different things, and it'd be nice to
separate those concerns to the degree possible.
This would probably mean adding more meta-nodes in the non-simplified version of the graph,
but that is generally a non-issue, as no-one should be using that anyhow...

An example would be including an `ELSE` node before the statements of the else block, 
so that we can easily link the else syntax-node to that.
*/

/*
OK, after playing a bit with Python it seems that I don't need a second pass, only to know what I'm doing with the current one.
Also, it seems that nodes don't capture whitespace very well, so...

For a Python `if`, I need a query that looks like:

```
(if_statement
  (":") @colon
)
```

To capture the colon and know where the whitespace beyond it starts.
To actually use that, I need a link function that can handle that.
Something along the lines of:
1. Link from end-of-A to start-of-B

So with:
      (if_statement
          condition: (_) @if-cond
          (":") @colon
          consequence: (block) @then
          alternative: [
              (elif_clause 
                  condition: (_) @elif-cond
                  consequence: (block) @elif) @elif-clause
              (else_clause (block) @else) @else-clause
                            ]*
      ) @if

This'd be something like `link(from-end-of: colon, to-start-of: then, to-node-for: then)
Which would eat the space.
The alternative is end-of-A to end-of-B.
Also - we can link from the end-of colon to end-of then / start-of-alternative.
The bonus of using end-of for this is that we always have end-of then, but not always start-of-alternative.

that said, it's not strictly necessary to map all the way to the end of then, as we'll get that from the then-block anyhow.
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
  private ranges: { start: number, stop: number, value: Parser.SyntaxNode }[] = [];


  public add(syntax: Parser.SyntaxNode, node: string) {
    console.log(node, syntax.text.split("\n")[0], syntax.toString());
    this.syntaxToNode.set(syntax, node);

    this.ranges.push({ start: syntax.startIndex, stop: syntax.endIndex, value: syntax })
  }

  public linkGap(from: Parser.SyntaxNode, to: Parser.SyntaxNode) {
    this.range(from.endIndex, to.startIndex, to);
  }

  public range(start: number, stop: number, syntax: Parser.SyntaxNode) {
    this.ranges.push({ start, stop, value: syntax })
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

  /**
   * 
   * @returns Mapping from syntax-IDs to node names
   */
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

  private buildRanges(functionSyntax: Parser.SyntaxNode): SimpleRange<Parser.SyntaxNode>[] {
    const ranges = newRanges(functionSyntax);
    for (const { start, stop, value } of this.ranges.toSorted((b, a) => (a.stop - a.start) - (b.stop - b.start))) {
      inplaceAddRange(ranges, start, stop, value);
    }
    return ranges;
  }

  public getIndexMapping(functionSyntax: Parser.SyntaxNode): SimpleRange<string>[] {
    const syntaxToNode = this.getMapping(functionSyntax);
    const ranges = this.buildRanges(functionSyntax);
    return ranges.map(({ start, value }) => ({ start, value: syntaxToNode.get(value.id) ?? "Not found" }))
  }
}
