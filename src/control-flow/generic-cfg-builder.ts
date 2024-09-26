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
import { NodeMapper } from "./node-mapper";
import { pairwise } from "./zip";

export class GenericCFGBuilder {
  private builder: Builder = new Builder();
  private readonly options: BuilderOptions;
  private readonly handlers: StatementHandlers;
  private readonly nodeMapper: NodeMapper = new NodeMapper();

  constructor(handlers: StatementHandlers, options: BuilderOptions) {
    this.options = options;
    this.handlers = handlers;
  }

  public buildCFG(functionNode: Parser.SyntaxNode): CFG {
    const startNode = this.builder.addNode("START", "START");
    this.nodeMapper.linkSytaxToNode(functionNode, startNode);
    const bodySyntax = functionNode.childForFieldName("body");
    if (bodySyntax) {
      const blockHandler = new BlockHandler();
      const { entry, exit } = blockHandler.update(
        this.dispatchMany(bodySyntax.namedChildren),
      );

      blockHandler.processGotos((gotoNode, labelNode) =>
        this.builder.addEdge(gotoNode, labelNode),
      );

      const endNode = this.builder.addNode("RETURN", "implicit return");
      // `entry` will be non-null for any valid code
      if (entry) this.builder.addEdge(startNode, entry);
      if (exit) this.builder.addEdge(exit, endNode);

      // Make sure the end of the function is linked to the last piece of code, not to the top of the function.
      const lastStatement =
        bodySyntax.namedChildren[bodySyntax.namedChildren.length - 1];
      if (lastStatement) {
        this.nodeMapper.linkOffsetToSyntax(lastStatement, functionNode, {
          includeTo: true,
          reverse: true,
        });
      }
    }

    return {
      graph: this.builder.getGraph(),
      entry: startNode,
      offsetToNode: this.nodeMapper.getIndexMapping(functionNode),
    };
  }

  private dispatchSingle(syntax: Parser.SyntaxNode | null): BasicBlock {
    if (!syntax) {
      const emptyNode = this.builder.addNode("EMPTY", "Empty node");
      return { entry: emptyNode, exit: emptyNode };
    }

    const handler = this.handlers.named[syntax.type] ?? this.handlers.default;
    const matcher = new BlockMatcher(this.dispatchSingle.bind(this));
    return handler(syntax, {
      builder: this.builder,
      matcher: matcher,
      state: matcher.state,
      options: this.options,
      dispatch: {
        single: this.dispatchSingle.bind(this),
        many: this.dispatchMany.bind(this),
      },
      link: {
        syntaxToNode: this.nodeMapper.linkSytaxToNode.bind(this.nodeMapper),
        offsetToSyntax: this.nodeMapper.linkOffsetToSyntax.bind(
          this.nodeMapper,
        ),
      },
    });
  }

  private dispatchMany(statements: Parser.SyntaxNode[]): BasicBlock {
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

    const blocks = codeStatements.map((statement) =>
      blockHandler.update(this.dispatchSingle(statement)),
    );

    for (const [prevStatement, statement] of pairwise(codeStatements)) {
      this.nodeMapper.linkOffsetToSyntax(prevStatement, statement);
    }

    for (const [{ exit: prevExit }, { entry: currentEntry }] of pairwise(
      blocks,
    )) {
      if (prevExit) {
        this.builder.addEdge(prevExit, currentEntry);
      }
    }

    return blockHandler.update({
      // @ts-expect-error: We know there's at least one block
      entry: blocks[0].entry,
      // @ts-expect-error: We know there's at least one block
      exit: blocks[blocks.length - 1].exit,
    });
  }
}
