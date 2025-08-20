import type { Node as SyntaxNode } from "web-tree-sitter";
import treeSitterCpp from "../../parsers/tree-sitter-cpp.wasm?url";
import { getStatementHandlers } from "./cfg-c.ts";
import type { BasicBlock, BuilderOptions, CFGBuilder } from "./cfg-defs";
import {
  forEachLoopProcessor,
  processReturnStatement,
  processThrowStatement,
} from "./common-patterns.ts";
import {
  type Context,
  GenericCFGBuilder,
  type StatementHandlers,
} from "./generic-cfg-builder.ts";
import { pairwise, zip } from "./itertools.ts";
import { extractTaggedValueFromTreeSitterQuery } from "./query-utils.ts";

export const cppLanguageDefinition = {
  wasmPath: treeSitterCpp,
  createCFGBuilder: createCFGBuilder,
  functionNodeTypes: ["function_definition", "lambda_expression"],
};

export function createCFGBuilder(options: BuilderOptions): CFGBuilder {
  return new GenericCFGBuilder(statementHandlers, options);
}

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
const cppSpecificHandlers: StatementHandlers["named"] = {
  try_statement: processTryStatement,
  throw_statement: processThrowStatement,
  co_return_statement: processReturnStatement,
  co_yield_statement: processCoYieldStatement,
  for_range_loop: processForRangeStatement,
};
Object.assign(statementHandlers.named, cppSpecificHandlers);

function processCoYieldStatement(
  coYieldSyntax: SyntaxNode,
  ctx: Context,
): BasicBlock {
  const yieldNode = ctx.builder.addNode(
    "YIELD",
    coYieldSyntax.text,
    coYieldSyntax.startIndex,
  );
  ctx.link.syntaxToNode(coYieldSyntax, yieldNode);
  return { entry: yieldNode, exit: yieldNode };
}

function isCatchAll(catchSyntax: SyntaxNode): boolean {
  return Boolean(
    catchSyntax
      .childForFieldName("parameters")
      ?.children.some((child) => child?.text === "..."),
  );
}

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
          (
              (catch_clause body: (_) @except-body) @except
              (comment)?
          )*
      ) @try
      `,
  );

  const bodySyntax = match.requireSyntax("try-body");
  const catchSyntaxMany = match.getSyntaxMany("except-body");

  const mergeNode = builder.addNode(
    "MERGE",
    "merge tryComplex",
    trySyntax.endIndex,
  );

  return builder.withCluster("tryComplex", (_tryComplexCluster) => {
    const bodyBlock = builder.withCluster("try", () =>
      match.getBlock(bodySyntax),
    );
    ctx.link.syntaxToNode(trySyntax, bodyBlock.entry);

    const exceptBlocks = catchSyntaxMany.map((exceptSyntax) =>
      builder.withCluster("except", () => match.getBlock(exceptSyntax)),
    );

    // Handle segmentation
    for (const [syntax, { entry }] of zip(
      match.getSyntaxMany("except"),
      exceptBlocks,
    )) {
      ctx.link.syntaxToNode(syntax, entry);
    }
    for (const [first, second] of pairwise(match.getSyntaxMany("except"))) {
      ctx.link.offsetToSyntax(first, second, { reverse: true });
    }

    // We attach the except-blocks to the top of the `try` body.
    // In the rendering, we will connect them to the side of the node, and use invisible lines for it.
    const headNode = bodyBlock.entry;
    for (const [exceptBlock, exceptSyntax] of zip(
      exceptBlocks,
      match.getSyntaxMany("except"),
    )) {
      // Yes, this is effectively a head-to-head link. But that's ok.
      builder.addEdge(headNode, exceptBlock.entry, "exception");
      if (isCatchAll(exceptSyntax)) {
        // We reached a `catch (...)`, so the rest are unreachable.
        break;
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

const nodeType = {
  functionDefinition: "function_definition",
  lambdaExpression: "lambda_expression",

  // inline/function‑assignment cases
  variableDeclaration: "variable_declaration",
  initDeclarator: "init_declarator",

  // identifier lookups
  identifier: "identifier",

  //Unnamed functions
  anonymous: "<anonymous>",

  //Special cases , operator-name and destructor-name
  operatorName: "operator_name",
  destructorName: "destructor_name",
};

function findCppNameInParentHierarchy(
  func: SyntaxNode,
  parentType: string,
  childType: string,
): string | undefined {
  let parent = func.parent;
  while (parent) {
    if (parent.type === parentType) {
      return undefined;
    }
    parent = parent.parent;
  }
  return undefined;
}

export function extractCppFunctionName(func: SyntaxNode): string | undefined {
  if (func.type === nodeType.functionDefinition) {
    // Look for an operator overload (This should happen before the identifier/destructor).
    const operatorNode = func.descendantsOfType(nodeType.operatorName)[0];
    if (operatorNode) return operatorNode.text;

    // else, look for the destructor name, which is a special case because identifier returns without the ~
    const destructorNode = func.descendantsOfType(nodeType.destructorName)[0];
    if (destructorNode) {
      return destructorNode.text;
    }
    //if neither of those, look for the identifier
    const idNode = func.descendantsOfType(nodeType.identifier)[0];
    if (idNode) return idNode.text;
  }
  if (func.type === nodeType.lambdaExpression) {
    // if the lambda is assigned to a variable, return the variable name
    // otherwise return "<Anonymous>"
    return (
      findCppNameInParentHierarchy(
        func,
        nodeType.variableDeclaration,
        nodeType.identifier,
      ) ||
      findCppNameInParentHierarchy(
        func,
        nodeType.initDeclarator,
        nodeType.identifier,
      ) ||
      nodeType.anonymous
    );
  }
  return undefined;
}
