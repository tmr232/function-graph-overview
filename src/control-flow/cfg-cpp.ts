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
import { extractCapturedTextsByCaptureName } from "./query-utils.ts";

export const cppLanguageDefinition = {
  wasmPath: treeSitterCpp,
  createCFGBuilder: createCFGBuilder,
  functionNodeTypes: ["function_definition", "lambda_expression"],
  extractFunctionName: extractCppFunctionName,
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

const functionQuery = {
  functionDeclarator: `
    (function_declarator
    declarator: [
      (identifier)        		
      (type_identifier)   		
      (destructor_name)   		
      (operator_name)     		
      (operator_cast)     		
      (field_identifier)  		
      (qualified_identifier)	
    ] @name )
`,

  initDeclarator: `
   (init_declarator
      declarator: (_) @name)
  `,

  captureName: "name",
};

const validDeclaratorTypes = new Set([
  "identifier",
  "operator_name",
  "operator_cast",
  "destructor_name",
  "qualified_identifier",
  "type_identifier",
  "field_identifier",
]);

/**
 * Get the function_declarator node for a function_definition.
 * Uses descendantsOfType to find it directly, even if wrapped
 * in pointer/reference/parenthesized declarators.
 */
function getFunctionDeclarator(funcDef: SyntaxNode): SyntaxNode | null {
  const body = funcDef.childForFieldName("body");
  const end = body ? body.startPosition : funcDef.endPosition;

  const nodes = funcDef.descendantsOfType(
    "function_declarator",
    funcDef.startPosition,
    end,
  );

  for (const node of nodes) {
    const decl = node?.childForFieldName("declarator");
    if (decl && validDeclaratorTypes.has(decl.type)) {
      return node;
    }
  }

  return null;
}

function extractCppFunctionName(func: SyntaxNode): string | undefined {
  if (func.type === "function_definition") {
    const declarator = getFunctionDeclarator(func);
    const name = declarator
      ? extractCapturedTextsByCaptureName(
          declarator,
          functionQuery.functionDeclarator,
          functionQuery.captureName,
        )[0]
      : undefined;
    if (name) return name;

    //From my observations, the only functions that do not have a function_declarator child are conversion operators.
    //To extract their names, I need to manipulate strings (not ideal, but it works).
    const fullDeclarationName = func.childForFieldName("declarator");
    return fullDeclarationName?.text.split("(")[0];
  }

  if (func.type === "lambda_expression") {
    const name = findVariableBinding(func);
    return name;
  }
  return undefined;
}

function findVariableBinding(func: SyntaxNode): string | undefined {
  const parent = func.parent;
  if (!parent) return undefined;

  if (parent.type === "assignment_expression") {
    const name = parent.childForFieldName("left");
    return name?.type === "identifier" || name?.type === "field_expression"
      ? name.text
      : undefined;
  }

  if (parent.type === "init_declarator") {
    return extractCapturedTextsByCaptureName(
      parent,
      functionQuery.initDeclarator,
      functionQuery.captureName,
    )[0];
  }
  return undefined;
}
