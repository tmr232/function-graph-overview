import Parser from "web-tree-sitter";
import { type BasicBlock, BlockHandler } from "./cfg-defs.ts";

function matchQuery(syntax: Parser.SyntaxNode, queryString: string) {
  const language = syntax.tree.getLanguage();
  const query = language.query(queryString);
  const matches = query.matches(syntax, { maxStartDepth: 0 });
  if (matches.length === 0) {
    throw new Error(`No match found for query.`);
  }
  return matches[0];
}

export function matchExistsIn(
  syntax: Parser.SyntaxNode,
  mainName: string,
  queryString: string,
): boolean {
  const language = syntax.tree.getLanguage();
  const query = language.query(queryString);
  const matches = query.matches(syntax);
  return matches.length > 0;
}

function getSyntax(
  match: Parser.QueryMatch,
  name: string,
): Parser.SyntaxNode | undefined {
  return getSyntaxMany(match, name)[0];
}

function getSyntaxMany(
  match: Parser.QueryMatch,
  name: string,
): Parser.SyntaxNode[] {
  return match.captures
    .filter((capture) => capture.name === name)
    .map((capture) => capture.node);
}

export class BlockMatcher {
  private blockHandler: BlockHandler = new BlockHandler();
  private processBlock: (syntax: Parser.SyntaxNode | null) => BasicBlock;
  public update = this.blockHandler.update.bind(this.blockHandler);

  constructor(processBlock: BlockMatcher["processBlock"]) {
    this.processBlock = processBlock;
  }

  public match(syntax: Parser.SyntaxNode, queryString: string) {
    const match = matchQuery(syntax, queryString);
    return new Match(match, this.blockHandler, this.processBlock);
  }

  public get state() {
    return this.blockHandler;
  }
}

class Match {
  private match: Parser.QueryMatch;
  private blockHandler: BlockHandler;
  private processBlock: BlockMatcher["processBlock"];
  constructor(
    match: Parser.QueryMatch,
    blockHandler: BlockHandler,
    processBlock: BlockMatcher["processBlock"],
  ) {
    this.match = match;
    this.blockHandler = blockHandler;
    this.processBlock = processBlock;
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
}
