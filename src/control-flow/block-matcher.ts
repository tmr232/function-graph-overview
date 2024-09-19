import Parser from "web-tree-sitter";
import { type BasicBlock, BlockHandler } from "./cfg-defs.ts";

function matchQuery(
  syntax: Parser.SyntaxNode,
  mainName: string,
  queryString: string
) {
  const language = syntax.tree.getLanguage();
  const query = language.query(queryString);
  const matches = query.matches(syntax);
  const match = (() => {
    for (const match of matches) {
      for (const capture of match.captures) {
        if (capture.name === mainName && capture.node.id === syntax.id) {
          return match;
        }
      }
    }
    throw new Error("No match found!");
  })();
  return match;
}

export function matchExistsIn(
  syntax: Parser.SyntaxNode,
  mainName: string,
  queryString: string
): boolean {
  const language = syntax.tree.getLanguage();
  const query = language.query(queryString);
  const matches = query.matches(syntax);
  return matches.length > 0;
}

function getSyntax(
  match: Parser.QueryMatch,
  name: string
): Parser.SyntaxNode | undefined {
  return getSyntaxMany(match, name)[0];
}

function getSyntaxMany(
  match: Parser.QueryMatch,
  name: string
): Parser.SyntaxNode[] {
  return match.captures
    .filter((capture) => capture.name === name)
    .map((capture) => capture.node);
}

export class BlockMatcher {
  private blockHandler: BlockHandler = new BlockHandler();
  private processBlock: (syntax: Parser.SyntaxNode | null) => BasicBlock;
  public update = this.blockHandler.update.bind(this.blockHandler);
  private match: Parser.QueryMatch;

  constructor(
    processBlock: BlockMatcher["processBlock"],
    syntax: Parser.SyntaxNode,
    mainName: string,
    query: string
  ) {
    this.processBlock = processBlock;
    this.match = matchQuery(syntax, mainName, query);
  }

  public getSyntax(name: string): ReturnType<typeof getSyntax> {
    return getSyntax(this.match, name);
  }

  public getSyntaxMany(name: string): ReturnType<typeof getSyntaxMany> {
    return getSyntaxMany(this.match, name);
  }

  public getBlock(syntax: Parser.SyntaxNode | null | undefined) {
    return syntax ? this.blockHandler.update(this.processBlock(syntax)) : null;
  }

  public get state() {
    return this.blockHandler;
  }
}