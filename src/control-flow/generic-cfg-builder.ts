import type { Node as SyntaxNode } from "web-tree-sitter";
import { BlockMatcher } from "./block-matcher";
import { Builder } from "./builder";
import {
  type BasicBlock,
  BlockHandler,
  type BuilderOptions,
  type CFG,
} from "./cfg-defs";
import { treeSitterNoNullNodes } from "./hacks.ts";
import { pairwise } from "./itertools.ts";
import { NodeMapper } from "./node-mapper";

export interface Dispatch {
  /**
   * Process a single AST node into a basic block
   * @param syntax
   */
  single(syntax: SyntaxNode | null, extra?: Extra): BasicBlock;

  /**
   * Process an array of AST nodes into a basic clock
   * @param statements
   * @param parent is the parent node for the statements, used for
   *        its positioning information if the statements array is empty.
   */
  many(statements: SyntaxNode[], parent: SyntaxNode): BasicBlock;
}

export interface Link {
  syntaxToNode: InstanceType<typeof NodeMapper>["linkSyntaxToNode"];
  offsetToSyntax: InstanceType<typeof NodeMapper>["linkOffsetToSyntax"];
}

export interface Context {
  builder: Builder;
  options: BuilderOptions;
  matcher: BlockMatcher;
  dispatch: Dispatch;
  state: BlockHandler;
  link: Link;
  extra?: Extra;
  callProcessor?: (
    call: SyntaxNode,
    functionName: string,
    ctx: Context,
  ) => BasicBlock | undefined;
}

/**
 * Bits of extra context to add when needed.
 */
export interface Extra {
  /**
   * The label for the current statement, of one exists
   */
  label?: string;
}

/**
 * A function that converts an AST node to a CFG basic-block.
 *
 * @param syntax The AST node to be processed
 * @param ctx The context in which the statement is being handled
 * @returns A basic block representation of the AST node
 */
export type StatementHandler = (syntax: SyntaxNode, ctx: Context) => BasicBlock;
/**
 * Maps AST nodes to their matching `StatementHandler` functions.
 */
export type StatementHandlers = {
  /**
   * Named entries map use the AST node names to map
   */
  named: { [key: string]: StatementHandler };
  /**
   * The default entry handles all the other AST nodes
   */
  default: StatementHandler;
};

/**
 * This class is responsible for building a CFG from an AST.
 */
export class GenericCFGBuilder {
  private builder: Builder = new Builder();
  private readonly options: BuilderOptions;
  private readonly handlers: StatementHandlers;
  private readonly nodeMapper: NodeMapper = new NodeMapper();

  constructor(handlers: StatementHandlers, options: BuilderOptions) {
    this.options = options;
    this.handlers = handlers;
  }

  public buildCFG(functionNode: SyntaxNode): CFG {
    const startNode = this.builder.addNode(
      "START",
      "START",
      functionNode.startIndex,
    );
    this.nodeMapper.linkSyntaxToNode(functionNode, startNode);
    const bodySyntax = functionNode.childForFieldName("body");
    if (bodySyntax) {
      const blockHandler = new BlockHandler();
      const { entry, exit } = blockHandler.update(
        this.dispatchMany(
          treeSitterNoNullNodes(bodySyntax.namedChildren),
          bodySyntax,
        ),
      );

      blockHandler.processGotos((gotoNode, labelNode) =>
        this.builder.addEdge(gotoNode, labelNode),
      );

      const endNode = this.builder.addNode(
        "RETURN",
        "implicit return",
        functionNode.endIndex,
      );
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

  private dispatchSingle(syntax: SyntaxNode, extra?: Extra): BasicBlock {
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
        syntaxToNode: this.nodeMapper.linkSyntaxToNode.bind(this.nodeMapper),
        offsetToSyntax: this.nodeMapper.linkOffsetToSyntax.bind(
          this.nodeMapper,
        ),
      },
      extra: extra,
      callProcessor: this.options.callProcessor,
    });
  }

  private dispatchMany(
    statements: SyntaxNode[],
    parent: SyntaxNode,
  ): BasicBlock {
    const blockHandler = new BlockHandler();
    // Ignore comments
    const codeStatements = statements.filter((syntax) => {
      if (syntax.type !== "comment") {
        return true;
      }

      return Boolean(this.options.markerPattern?.test(syntax.text));
    });

    if (codeStatements.length === 0) {
      const emptyNode = this.builder.addNode(
        "EMPTY",
        "empty block",
        parent.startIndex,
      );
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
