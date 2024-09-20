import type Parser from "web-tree-sitter";
import { Builder } from "./builder";
import {
  BlockHandler,
  type BasicBlock,
  type BuilderOptions,
  type CFG,
} from "./cfg-defs";
import type { StatementHandlers } from "./statement-handlers";
import { BlockMatcher } from "./block-matcher";

export class GenericCFGBuilder {
  private builder: Builder = new Builder();
  private readonly options: BuilderOptions;
  private readonly handlers: StatementHandlers;

  constructor(handlers: StatementHandlers, options: BuilderOptions) {
    this.options = options;
    this.handlers = handlers;
  }

  public buildCFG(functionNode: Parser.SyntaxNode): CFG {
    const startNode = this.builder.addNode("START", "START");

    const bodySyntax = functionNode.childForFieldName("body");
    if (bodySyntax) {
      const blockHandler = new BlockHandler();
      const { entry, exit } = blockHandler.update(
        this.processStatements(bodySyntax.namedChildren),
      );

      blockHandler.processGotos((gotoNode, labelNode) =>
        this.builder.addEdge(gotoNode, labelNode),
      );

      const endNode = this.builder.addNode("RETURN", "implicit return");
      // `entry` will be non-null for any valid code
      if (entry) this.builder.addEdge(startNode, entry);
      if (exit) this.builder.addEdge(exit, endNode);
    }
    return { graph: this.builder.getGraph(), entry: startNode };
  }

  private processBlock(syntax: Parser.SyntaxNode | null): BasicBlock {
    if (!syntax) return { entry: null, exit: null };

    const handler = this.handlers.named[syntax.type] ?? this.handlers.default;
    const matcher = new BlockMatcher(this.processBlock.bind(this));
    return handler(syntax, {
      builder: this.builder,
      matcher: matcher,
      state: matcher.state,
      options: this.options,
      dispatch: {
        single: this.processBlock.bind(this),
        many: this.processStatements.bind(this),
      },
    });
  }

  private processStatements(statements: Parser.SyntaxNode[]): BasicBlock {
    const blockHandler = new BlockHandler();
    // Ignore comments
    const codeStatements = statements.filter((syntax) => {
      if (syntax.type !== "comment") {
        return true;
      }

      return (
        this.options.markerPattern &&
        Boolean(syntax.text.match(this.options.markerPattern))
      );
    });

    if (codeStatements.length === 0) {
      const emptyNode = this.builder.addNode("EMPTY", "empty block");
      return { entry: emptyNode, exit: emptyNode };
    }

    let entry: string | null = null;
    let previous: string | null = null;
    for (const statement of codeStatements) {
      const { entry: currentEntry, exit: currentExit } = blockHandler.update(
        this.processBlock(statement),
      );
      if (!entry) entry = currentEntry;
      if (previous && currentEntry)
        this.builder.addEdge(previous, currentEntry);
      previous = currentExit;
    }
    return blockHandler.update({ entry, exit: previous });
  }
}