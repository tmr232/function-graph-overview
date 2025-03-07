import type { Node as SyntaxNode } from "web-tree-sitter";
import { getStatementHandlers } from "./cfg-c.ts";
import type { BasicBlock, BuilderOptions, CFGBuilder } from "./cfg-defs";
import {
  forEachLoopProcessor,
  processThrowStatement,
} from "./common-patterns.ts";
import {
  type Context,
  GenericCFGBuilder,
  type StatementHandlers,
} from "./generic-cfg-builder.ts";
import { zip } from "./itertools.ts";

export function createCFGBuilder(options: BuilderOptions): CFGBuilder {
  return new GenericCFGBuilder(statementHandlers, options);
}

export const functionNodeNames = ["function_definition", "lambda_expression"];

const processForRangeStatement = forEachLoopProcessor({
  query: `
			(for_range_loop
					")" @close-paren
					body: (_) @body
			) @range-loop
      `,
  body: "body",
  headerEnd: "close-paren",
});

const statementHandlers: StatementHandlers = getStatementHandlers();
const cppSpecificHandlers = {
  try_statement: processTryStatement,
  throw_statement: processThrowStatement,
  for_range_loop: processForRangeStatement,
};
Object.assign(statementHandlers.named, cppSpecificHandlers);

function processTryStatement(trySyntax: SyntaxNode, ctx: Context): BasicBlock {
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
