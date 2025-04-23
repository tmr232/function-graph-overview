import type { Node as SyntaxNode } from "web-tree-sitter";
import treeSitterTSX from "../../parsers/tree-sitter-tsx.wasm?url";
import treeSitterTypeScript from "../../parsers/tree-sitter-typescript.wasm?url";
import { matchExistsIn } from "./block-matcher.ts";
import type { BasicBlock, BuilderOptions, CFGBuilder } from "./cfg-defs";
import {
  cStyleDoWhileProcessor,
  cStyleForStatementProcessor,
  cStyleIfProcessor,
  cStyleWhileProcessor,
  forEachLoopProcessor,
  labeledBreakProcessor,
  processComment,
  processContinueStatement,
  processLabeledStatement,
  processReturnStatement,
  processStatementSequence,
  processThrowStatement,
} from "./common-patterns.ts";
import {
  extractNameByNodeName,
  findNameInParentHierarchy,
} from "./function-utils.ts";
import {
  type Context,
  GenericCFGBuilder,
  type StatementHandlers,
} from "./generic-cfg-builder.ts";
import { treeSitterNoNullNodes } from "./hacks.ts";
import { buildSwitch, collectCases } from "./switch-utils.ts";

const typeScriptFunctionNodeTypes = [
  "function_declaration",
  "arrow_function",
  "method_definition",
  "function_expression",
  "generator_function",
  "generator_function_declaration",
];
export const typeScriptLanguageDefinition = {
  wasmPath: treeSitterTypeScript,
  createCFGBuilder: createCFGBuilder,
  functionNodeTypes: typeScriptFunctionNodeTypes,
};
export const tsxLanguageDefinition = {
  wasmPath: treeSitterTSX,
  createCFGBuilder: createCFGBuilder,
  functionNodeTypes: typeScriptFunctionNodeTypes,
};

export function createCFGBuilder(options: BuilderOptions): CFGBuilder {
  return new GenericCFGBuilder(statementHandlers, options);
}

const ifStatementQuery = `
      (if_statement
        condition: (_ ")" @closing-paren) @cond
        consequence: (_) @then
        alternative: (
            else_clause ([
                (if_statement) @else-if
                (statement_block) @else-body
                ])
        )? @else
      )@if
  `;

const processForStatement = forEachLoopProcessor({
  query: `
    (for_in_statement
      (")") @closingParen
      body: (_) @body
    ) @for
      `,
  body: "body",
  headerEnd: "closingParen",
});

const cStyleForStatementQuery = `
(for_statement
    "(" @open-parens
    [
        initializer: (_ ";" @init-semi)? @init
        ";" @init-semi
    ]
    
    condition: [
        (empty_statement (";") @cond-semi)
        (
            (_) @cond
            (#not-eq? @cond ";")
            ";" @cond-semi
        )
    ]
    
    increment: (_)? @update
    ")" @close-parens
    body: (_) @body
) @for
`;

const processBreakStatement = labeledBreakProcessor(`
    (break_statement
        label: (_)? @label
    )
    `);
const statementHandlers: StatementHandlers = {
  named: {
    statement_block: processStatementSequence,
    if_statement: cStyleIfProcessor(ifStatementQuery),
    for_in_statement: processForStatement,
    for_statement: cStyleForStatementProcessor(cStyleForStatementQuery),
    while_statement: cStyleWhileProcessor(),
    do_statement: cStyleDoWhileProcessor(),
    switch_statement: processSwitchlike,
    continue_statement: processContinueStatement,
    break_statement: processBreakStatement,
    return_statement: processReturnStatement,
    comment: processComment,
    labeled_statement: processLabeledStatement,
    try_statement: processTryStatement,
    throw_statement: processThrowStatement,
  },
  default: defaultProcessStatement,
};

function defaultProcessStatement(syntax: SyntaxNode, ctx: Context): BasicBlock {
  const { builder } = ctx;
  const hasYield = matchExistsIn(syntax, "(yield_expression) @yield");
  if (hasYield) {
    const yieldNode = builder.addNode("YIELD", syntax.text, syntax.startIndex);
    ctx.link.syntaxToNode(syntax, yieldNode);
    return { entry: yieldNode, exit: yieldNode };
  }
  const newNode = builder.addNode("STATEMENT", syntax.text, syntax.startIndex);
  ctx.link.syntaxToNode(syntax, newNode);
  return { entry: newNode, exit: newNode };
}

const caseTypes = new Set(["switch_case", "switch_default"]);

function getCases(switchSyntax: SyntaxNode): SyntaxNode[] {
  const switchBody = switchSyntax.namedChildren[1] as SyntaxNode;
  return treeSitterNoNullNodes(switchBody.namedChildren).filter((child) =>
    caseTypes.has(child.type),
  );
}

function parseCase(caseSyntax: SyntaxNode): {
  isDefault: boolean;
  consequence: SyntaxNode[];
  hasFallthrough: boolean;
} {
  const isDefault = caseSyntax.type === "switch_default";
  const consequence = treeSitterNoNullNodes(caseSyntax.namedChildren).slice(
    isDefault ? 0 : 1,
  );
  const hasFallthrough = true;
  return { isDefault, consequence, hasFallthrough };
}

function processSwitchlike(switchSyntax: SyntaxNode, ctx: Context): BasicBlock {
  const blockHandler = ctx.matcher.state;

  const cases = collectCases(switchSyntax, ctx, { getCases, parseCase });
  const headNode = ctx.builder.addNode(
    "SWITCH_CONDITION",
    getChildFieldText(switchSyntax, "value"),
    switchSyntax.startIndex,
  );
  ctx.link.syntaxToNode(switchSyntax, headNode);
  const mergeNode: string = ctx.builder.addNode(
    "SWITCH_MERGE",
    "",
    switchSyntax.endIndex,
  );
  buildSwitch(cases, mergeNode, headNode, {}, ctx);

  blockHandler.forEachBreak((breakNode) => {
    ctx.builder.addEdge(breakNode, mergeNode);
  }, ctx.extra?.label);

  const braceMatch = ctx.matcher.match(
    switchSyntax,
    `
    (switch_statement 
	      body: (switch_body "{" @opening-brace "}" @closing-brace)
    ) @switch
    `,
  );
  const openingBrace = braceMatch.requireSyntax("opening-brace");
  const closingBrace = braceMatch.requireSyntax("closing-brace");
  const caseSyntaxMany = getCases(switchSyntax);
  const firstCase = caseSyntaxMany[0];
  if (firstCase) {
    ctx.link.offsetToSyntax(openingBrace, firstCase);
  }
  const lastCase = caseSyntaxMany[caseSyntaxMany.length - 1];
  if (lastCase) {
    ctx.link.offsetToSyntax(lastCase, closingBrace, {
      reverse: true,
      includeTo: true,
    });
  }

  return blockHandler.update({ entry: headNode, exit: mergeNode });
}

function getChildFieldText(node: SyntaxNode, fieldName: string): string {
  const child = node.childForFieldName(fieldName);
  return child ? child.text : "";
}

function processTryStatement(trySyntax: SyntaxNode, ctx: Context): BasicBlock {
  const { builder, matcher } = ctx;
  /*
  Here's an idea - I can duplicate the `finally` blocks!
  Then, if there's a function-exit, I stick the `finally` before it.
  In other cases, the finally is after the end of the try-body.
  This is probably the best course of action.
  */
  const match = matcher.match(
    trySyntax,
    `
    (try_statement
        body: (_) @try-body
        handler: (catch_clause
            body: (_) @except-body
        )? @except
        finalizer: (finally_clause
            body: (_) @finally-body
        )? @finally
    ) @try
      `,
  );

  const bodySyntax = match.requireSyntax("try-body");
  const exceptSyntax = match.getSyntax("except-body");
  const finallySyntax = match.getSyntax("finally-body");

  const mergeNode = builder.addNode(
    "MERGE",
    "merge tryComplex",
    trySyntax.endIndex,
  );

  return builder.withCluster("tryComplex", (tryComplexCluster) => {
    const bodyBlock = builder.withCluster("try", () =>
      match.getBlock(bodySyntax),
    );
    ctx.link.syntaxToNode(trySyntax, bodyBlock.entry);
    const headNode = bodyBlock.entry;

    // We handle `except` blocks before the `finally` block to support `return` handling.
    const exceptBlock = builder.withCluster("except", () =>
      match.getBlock(exceptSyntax),
    );
    if (exceptBlock) {
      ctx.link.syntaxToNode(match.requireSyntax("except"), exceptBlock.entry);

      // We attach the except-blocks to the top of the `try` body.
      // In the rendering, we will connect them to the side of the node, and use invisible lines for it.
      // Yes, this is effectively a head-to-head link. But that's ok.
      builder.addEdge(headNode, exceptBlock.entry, "exception");
    }

    const finallyBlock = builder.withCluster("finally", () => {
      // Handle all the function-exit statements from the try block
      if (finallySyntax) {
        // This is only relevant if there's a finally block.
        matcher.state.forEachFunctionExit((returnNode) => {
          // We create a new finally block for each function-exit node,
          // so that we can link them.
          const duplicateFinallyBlock = match.getBlock(finallySyntax);
          // We also clone the function-exit node, to place it _after_ the finally block
          // We also override the cluster node, pulling it up to the `tryComplex`,
          // as the function-exit is neither in a `try`, `except`, or `finally` context.
          const functionExitCloneNode = builder.cloneNode(returnNode, {
            cluster: tryComplexCluster,
          });

          builder.addEdge(returnNode, duplicateFinallyBlock.entry);
          if (duplicateFinallyBlock.exit)
            builder.addEdge(duplicateFinallyBlock.exit, functionExitCloneNode);

          // We return the cloned return node as the new function-exit node,
          // in case we're nested in a scope that will process it.
          return functionExitCloneNode;
        });
      }

      // Handle the finally-block for the trivial case, where we just pass through the try block
      // This must happen AFTER handling the function-exit statements,
      // as the finally block may add function-exit statements of its own.
      const finallyBlock = match.getBlock(finallySyntax);
      return finallyBlock;
    });
    if (finallyBlock) {
      ctx.link.syntaxToNode(match.requireSyntax("finally"), finallyBlock.entry);
    }

    // This is the exit we get to if we don't have an exception
    let happyExit: string | null = bodyBlock.exit;

    if (finallyBlock?.entry) {
      // Connect `try` to `finally`
      const toFinally = bodyBlock.exit;
      if (toFinally) builder.addEdge(toFinally, finallyBlock.entry);
      happyExit = finallyBlock.exit;
      // Connect `except` to `finally`
      if (exceptBlock?.exit)
        builder.addEdge(exceptBlock.exit, finallyBlock.entry as string);
    } else {
      // We need to connect the `except` blocks to the merge node
      if (exceptBlock?.exit) builder.addEdge(exceptBlock.exit, mergeNode);
    }

    if (happyExit) builder.addEdge(happyExit, mergeNode);

    return matcher.update({
      entry: bodyBlock.entry,
      exit: mergeNode,
    });
  });
}

const nodeType = {
  // function‑declaration cases
  functionDeclaration: "function_declaration",
  generatorFunctionDeclaration: "generator_function_declaration",

  // inline/function‑expression cases
  generatorFunction: "generator_function",
  arrowFunction: "arrow_function",
  functionExpression: "function_expression",

  // methods
  methodDefinition: "method_definition",

  // identifier lookups
  identifier: "identifier",
  variableDeclarator: "variable_declarator",
  propertyIdentifier: "property_identifier",

  // Unnamed functions
  anonymous: "<Anonymous>",
};

/**
 * Extracts the name of a TypeScript function based on its syntax node type.
 *
 * @param {SyntaxNode} func - The syntax node representing the TypeScript function.
 * @returns {string | undefined} The function name, or `undefined` if not found.
 */
export function extractTypeScriptFunctionName(
  func: SyntaxNode,
): string | undefined {
  switch (func.type) {
    case nodeType.functionDeclaration:
    case nodeType.generatorFunctionDeclaration:
      return extractNameByNodeName(func, nodeType.identifier);

    case nodeType.generatorFunction:
    case nodeType.arrowFunction:
      return (
        findNameInParentHierarchy(
          func,
          nodeType.variableDeclarator,
          nodeType.identifier,
        ) || nodeType.anonymous
      );

    case nodeType.methodDefinition:
      return extractNameByNodeName(func, nodeType.propertyIdentifier);

    case nodeType.functionExpression: {
      // first check for a direct name
      const optionalIdentifier = extractNameByNodeName(
        func,
        nodeType.identifier,
      );
      if (optionalIdentifier) return optionalIdentifier;

      // otherwise fall back to a variable‑assignment name
      return (
        findNameInParentHierarchy(
          func,
          nodeType.variableDeclarator,
          nodeType.identifier,
        ) || nodeType.anonymous
      );
    }
    default:
      return undefined;
  }
}
