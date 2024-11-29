import type Parser from "web-tree-sitter";
import type { BasicBlock, BuilderOptions, CFGBuilder } from "./cfg-defs";
import {
  type Context,
  GenericCFGBuilder,
  type StatementHandlers,
} from "./generic-cfg-builder.ts";
import { zip } from "./zip.ts";
import { getStatementHandlers } from "./cfg-c.ts";

export function createCFGBuilder(options: BuilderOptions): CFGBuilder {
  return new GenericCFGBuilder(statementHandlers, options);
}

export const functionNodeNames = ["function_definition", "lambda_expression"];

const statementHandlers: StatementHandlers = getStatementHandlers();
const cppSpecificHandlers = {
  try_statement: processTryStatement,
  throw_statement: processThrowStatement,
  for_range_loop: processForRangeLoopStatement,
};
Object.assign(statementHandlers.named, cppSpecificHandlers);

function processTryStatement(
  trySyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder, matcher } = ctx;
  /*
  Here's an idea - I can duplicate the finally blocks!
  Then if there's a return, I stick the finally before it.
  In other cases, the finally is after the end of the try-body.
  This is probably the best course of action.
  */
  const match = matcher.match(
    trySyntax,
    `
      (try_statement
      body: (_) @try-body
          (catch_clause body: (_) @catch-body)* @catch
      ) @try
      `,
  );

  const bodySyntax = match.requireSyntax("try-body");
  const catchSyntaxMany = match.getSyntaxMany("catch-body");

  const mergeNode = builder.addNode(
    "MERGE",
    "merge try-complex",
    trySyntax.endIndex,
  );

  return builder.withCluster("try-complex", (_tryComplexCluster) => {
    const bodyBlock = builder.withCluster("try", () =>
      match.getBlock(bodySyntax),
    );
    ctx.link.syntaxToNode(trySyntax, bodyBlock.entry);

    // We handle `except` blocks before the `finally` block to support `return` handling.
    const exceptBlocks = catchSyntaxMany.map((exceptSyntax) =>
      builder.withCluster("except", () => match.getBlock(exceptSyntax)),
    );
    for (const [syntax, { entry }] of zip(
      match.getSyntaxMany("except"),
      exceptBlocks,
    )) {
      ctx.link.syntaxToNode(syntax, entry);
    }
    // We attach the except-blocks to the top of the `try` body.
    // In the rendering, we will connect them to the side of the node, and use invisible lines for it.
    if (bodyBlock.entry) {
      const headNode = bodyBlock.entry;
      for (const exceptBlock of exceptBlocks) {
        // Yes, this is effectively a head-to-head link. But that's ok.
        builder.addEdge(headNode, exceptBlock.entry, "exception");
      }
    }

    // This is the exit we get to if we don't have an exception

    // We need to connect the `except` blocks to the merge node
    for (const exceptBlock of exceptBlocks) {
      if (exceptBlock.exit) builder.addEdge(exceptBlock.exit, mergeNode);
    }
    const happyExit: string | null = bodyBlock.exit;

    if (happyExit) builder.addEdge(happyExit, mergeNode);

    return matcher.update({
      entry: bodyBlock.entry,
      exit: mergeNode,
    });
  });
}

function processThrowStatement(
  throwSyntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder } = ctx;
  const throwNode = builder.addNode(
    "THROW",
    throwSyntax.text,
    throwSyntax.startIndex,
  );
  ctx.link.syntaxToNode(throwSyntax, throwNode);
  return { entry: throwNode, exit: null };
}

function processForRangeLoopStatement(
  forNode: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder, matcher } = ctx;
  const match = matcher.match(
    forNode,
    `
			(for_range_loop
					")" @close-paren
					body: (_) @body
			) @range-loop
      `,
  );

  const bodySyntax = match.requireSyntax("body");

  const bodyBlock = match.getBlock(bodySyntax);

  const headNode = builder.addNode(
    "LOOP_HEAD",
    "loop head",
    forNode.startIndex,
  );
  const exitNode = builder.addNode("FOR_EXIT", "loop exit", forNode.endIndex);
  const headBlock = { entry: headNode, exit: headNode };

  ctx.link.syntaxToNode(forNode, headNode);
  ctx.link.offsetToSyntax(match.requireSyntax("close-paren"), bodySyntax);

  /*
  head +-> body -> head
       --> else / exit
  break -> exit
  continue -> head
  */
  builder.addEdge(headBlock.exit, bodyBlock.entry, "consequence");
  if (bodyBlock.exit) builder.addEdge(bodyBlock.exit, headBlock.entry);

  builder.addEdge(headBlock.exit, exitNode, "alternative");

  matcher.state.forEachContinue((continueNode) => {
    builder.addEdge(continueNode, headNode);
  });

  matcher.state.forEachBreak((breakNode) => {
    builder.addEdge(breakNode, exitNode);
  });

  return matcher.update({ entry: headNode, exit: exitNode });
}
