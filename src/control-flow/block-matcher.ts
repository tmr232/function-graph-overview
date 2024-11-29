import Parser from "web-tree-sitter";
import { type BasicBlock, BlockHandler } from "./cfg-defs.ts";
import { evolve } from "./evolve.ts";

const defaultQueryOptions: Parser.QueryOptions = { maxStartDepth: 0 };

function matchQuery(
  syntax: Parser.SyntaxNode,
  queryString: string,
  options?: Parser.QueryOptions,
): Parser.QueryMatch {
  const language = syntax.tree.getLanguage();
  const query = language.query(queryString);
  options = evolve(defaultQueryOptions, options ?? {});
  const matches = query.matches(syntax, options);

  if (matches.length === 0) {
    throw new Error(`No match found for query.`);
  }
  // @ts-expect-error: tsc can't deduce that an element must exist.
  return matches[0];
}

export function matchExistsIn(
  syntax: Parser.SyntaxNode,
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

function getLastSyntax(
  match: Parser.QueryMatch,
  name: string,
): Parser.SyntaxNode | undefined {
  const many = getSyntaxMany(match, name);
  return many[many.length - 1];
}

function requireSyntax(
  match: Parser.QueryMatch,
  name: string,
): Parser.SyntaxNode {
  const syntax = getSyntax(match, name);
  if (!syntax) {
    throw new Error(`Failed getting syntax for ${name}`);
  }
  return syntax;
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
  private dispatchSingle: (syntax: Parser.SyntaxNode | null) => BasicBlock;
  public update = this.blockHandler.update.bind(this.blockHandler);

  constructor(dispatchSingle: BlockMatcher["dispatchSingle"]) {
    this.dispatchSingle = dispatchSingle;
  }

  public match(
    syntax: Parser.SyntaxNode,
    queryString: string,
    options?: Parser.QueryOptions,
  ): Match {
    const match = matchQuery(syntax, queryString, options);
    return new Match(match, this.blockHandler, this.dispatchSingle);
  }

  public tryMatch(
    syntax: Parser.SyntaxNode,
    queryString: string,
  ): Match | null {
    try {
      return this.match(syntax, queryString);
    } catch {
      return null;
    }
  }

  public get state() {
    return this.blockHandler;
  }
}

/**
 * A utility class for matching against the AST using queries.
 *
 * [tree-sitter query reference](https://tree-sitter.github.io/tree-sitter/using-parsers#pattern-matching-with-queries
 */
export class Match {
  private match: Parser.QueryMatch;
  private blockHandler: BlockHandler;
  private dispatchSingle: BlockMatcher["dispatchSingle"];

  constructor(
    match: Parser.QueryMatch,
    blockHandler: BlockHandler,
    dispatchSingle: BlockMatcher["dispatchSingle"],
  ) {
    this.match = match;
    this.blockHandler = blockHandler;
    this.dispatchSingle = dispatchSingle;
  }

  /**
   * Returns the first named syntax node from the query match, if present.
   * @param name Name of the capture
   * @returns {Parser.SyntaxNode|undefined} The syntax matching the capture name, if captured.
   */
  public getSyntax(name: string): ReturnType<typeof getSyntax> {
    return getSyntax(this.match, name);
  }

  /**
   * Returns the last named syntax node from the query match, if present.
   * @param name Name of the capture
   */
  public getLastSyntax(name: string): ReturnType<typeof getLastSyntax> {
    return getLastSyntax(this.match, name);
  }

  /**
   * Returns the first named syntax node from the query match.
   * Throws an error if no matching node exists.
   * @param name
   */
  public requireSyntax(name: string): ReturnType<typeof requireSyntax> {
    return requireSyntax(this.match, name);
  }
  /**
   * Returns the all named syntax nodes from the query match.
   * @param name Name of the capture
   */
  public getSyntaxMany(name: string): ReturnType<typeof getSyntaxMany> {
    return getSyntaxMany(this.match, name);
  }

  public getBlock(syntax: Parser.SyntaxNode): BasicBlock;
  public getBlock(
    syntax: Parser.SyntaxNode | null | undefined,
  ): BasicBlock | null;
  public getBlock(
    syntax: Parser.SyntaxNode | null | undefined,
  ): BasicBlock | null {
    return syntax
      ? this.blockHandler.update(this.dispatchSingle(syntax))
      : null;
  }

  public getManyBlocks(syntaxMany: Parser.SyntaxNode[]): BasicBlock[] {
    return syntaxMany.map((syntax) => this.getBlock(syntax) as BasicBlock);
  }
}
