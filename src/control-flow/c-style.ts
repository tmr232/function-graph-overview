import type Parser from "web-tree-sitter";
import type { Match } from "./block-matcher.ts";
import type { BasicBlock } from "./cfg-defs.ts";
import type { Context } from "./generic-cfg-builder.ts";
import { last, pairwise, zip } from "./itertools.ts";

export function cStyleIfProcessor(
  queryString: string,
): (ifSyntax: Parser.SyntaxNode, ctx: Context) => BasicBlock {
  return (ifSyntax: Parser.SyntaxNode, ctx: Context): BasicBlock => {
    const getIfs = (currentSyntax: Parser.SyntaxNode): Match[] => {
      const match = ctx.matcher.tryMatch(currentSyntax, queryString);
      if (!match) return [];
      const elseifSyntax = match.getSyntax("else-if");
      if (!elseifSyntax) return [match];
      return [match, ...getIfs(elseifSyntax)];
    };
    const allIfs = getIfs(ifSyntax);
    const blocks = allIfs.map((ifMatch) => ({
      condBlock: ifMatch.getBlock(ifMatch.requireSyntax("cond")),
      thenBlock: ifMatch.getBlock(ifMatch.requireSyntax("then")),
      elseBlock: ifMatch.getBlock(ifMatch.getSyntax("else-body")),
    }));

    for (const [ifMatch, { condBlock }] of zip(allIfs, blocks)) {
      ctx.link.syntaxToNode(ifMatch.requireSyntax("if"), condBlock.entry);
      ctx.link.offsetToSyntax(
        ifMatch.requireSyntax("closing-paren"),
        ifMatch.requireSyntax("then"),
      );
    }
    for (const [prevIf, thisIf] of pairwise(allIfs)) {
      ctx.link.offsetToSyntax(
        prevIf.requireSyntax("then"),
        thisIf.requireSyntax("if"),
      );
    }

    const headNode = ctx.builder.addNode(
      "CONDITION",
      "if-else head",
      ifSyntax.startIndex,
    );
    const mergeNode = ctx.builder.addNode(
      "MERGE",
      "if-else merge",
      ifSyntax.endIndex,
    );

    // An ugly hack to make tsc not hate us.
    const firstBlock = blocks[0];
    if (firstBlock?.condBlock.entry)
      ctx.builder.addEdge(headNode, firstBlock.condBlock.entry);

    let previous: string | null | undefined = null;
    for (const { condBlock, thenBlock } of blocks) {
      if (previous && condBlock.entry) {
        ctx.builder.addEdge(previous, condBlock.entry, "alternative");
      }
      if (condBlock.exit && thenBlock.entry) {
        ctx.builder.addEdge(condBlock.exit, thenBlock.entry, "consequence");
      }
      if (thenBlock.exit) {
        ctx.builder.addEdge(thenBlock.exit, mergeNode);
      }

      previous = condBlock.exit;
    }

    const elseBlock = last(blocks)?.elseBlock;
    if (elseBlock) {
      const lastMatch = last(allIfs) as Match;
      const elseSyntax = lastMatch.requireSyntax("else");
      ctx.link.syntaxToNode(elseSyntax, elseBlock.entry);
      ctx.link.offsetToSyntax(lastMatch.requireSyntax("then"), elseSyntax);

      if (previous && elseBlock.entry) {
        ctx.builder.addEdge(previous, elseBlock.entry, "alternative");
      }
      if (elseBlock.exit) ctx.builder.addEdge(elseBlock.exit, mergeNode);
    } else if (previous) {
      ctx.builder.addEdge(previous, mergeNode, "alternative");
    }
    return ctx.state.update({ entry: headNode, exit: mergeNode });
  };
}
