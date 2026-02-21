import type { Node as SyntaxNode } from "web-tree-sitter";
import treeSitterCSharp from "../../parsers/tree-sitter-c_sharp.wasm?url";
import type { BasicBlock, BuilderOptions, CFGBuilder } from "./cfg-defs";
import {
  cStyleDoWhileProcessor,
  cStyleIfProcessor,
  cStyleWhileProcessor,
  forEachLoopProcessor,
  getChildFieldText,
  processBreakStatement,
  processComment,
  processContinueStatement,
  processGotoStatement,
  processLabeledStatement,
  processReturnStatement,
  processStatementSequence,
  processThrowStatement,
} from "./common-patterns.ts";
import {
  type Context,
  GenericCFGBuilder,
  type StatementHandlers,
} from "./generic-cfg-builder.ts";
import { treeSitterNoNullNodes } from "./hacks.ts";
import { zip } from "./itertools.ts";
import { extractCapturedTextsByCaptureName } from "./query-utils.ts";
import { buildSwitch, collectCases } from "./switch-utils.ts";

export const csharpLanguageDefinition = {
  wasmPath: treeSitterCSharp,
  createCFGBuilder: createCFGBuilder,
  functionNodeTypes: [
    "method_declaration",
    "constructor_declaration",
    "local_function_statement",
    "lambda_expression",
    "accessor_declaration",
  ],
  extractFunctionName: extractCSharpFunctionName,
};

const ifStatementQuery = `
  (if_statement
    condition: (_) @cond
    ")" @closing-paren
    consequence: (_) @then
    alternative: ([
      (if_statement) @else-if
      (_) @else-body
    ])? @else
  ) @if
`;

const processIfStatement = cStyleIfProcessor(ifStatementQuery);

const processForEachStatement = forEachLoopProcessor({
  query: `
    (foreach_statement
      ")" @closingParen
      body: (_) @body
    ) @for
  `,
  body: "body",
  headerEnd: "closingParen",
});

const statementHandlers: StatementHandlers = {
  named: {
    block: processStatementSequence,
    if_statement: processIfStatement,
    for_statement: processForStatement,
    foreach_statement: processForEachStatement,
    while_statement: cStyleWhileProcessor(),
    do_statement: cStyleDoWhileProcessor(),
    switch_statement: processSwitchStatement,
    break_statement: processBreakStatement,
    continue_statement: processContinueStatement,
    return_statement: processReturnStatement,
    throw_statement: processThrowStatement,
    try_statement: processTryStatement,
    lock_statement: processLockStatement,
    using_statement: processUsingStatement,
    goto_statement: processGotoStatement,
    labeled_statement: processLabeledStatement,
    checked_statement: processStatementSequence,
    comment: processComment,
  },
  default: defaultProcessStatement,
};

function createCFGBuilder(options: BuilderOptions): CFGBuilder {
  return new GenericCFGBuilder(statementHandlers, options);
}

function defaultProcessStatement(syntax: SyntaxNode, ctx: Context): BasicBlock {
  const newNode = ctx.builder.addNode(
    "STATEMENT",
    syntax.text,
    syntax.startIndex,
  );
  ctx.link.syntaxToNode(syntax, newNode);
  return { entry: newNode, exit: newNode };
}

function processForStatement(forNode: SyntaxNode, ctx: Context): BasicBlock {
  const { builder, matcher } = ctx;

  const match = matcher.match(
    forNode,
    `
    (for_statement
      body: (_) @body
    ) @for
    `,
  );

  const initSyntax = forNode.childForFieldName("initializer");
  const condSyntax = forNode.childForFieldName("condition");
  const updateSyntax = forNode.childForFieldName("update");
  const bodySyntax = match.requireSyntax("body");

  const initBlock = initSyntax ? match.getBlock(initSyntax) : null;
  const condBlock = condSyntax ? match.getBlock(condSyntax) : null;
  const updateBlock = updateSyntax ? match.getBlock(updateSyntax) : null;
  const bodyBlock = match.getBlock(bodySyntax);

  const entryNode = builder.addNode("EMPTY", "loop head", forNode.startIndex);
  const exitNode = builder.addNode("FOR_EXIT", "loop exit", forNode.endIndex);
  const headNode = builder.addNode(
    "LOOP_HEAD",
    "loop head",
    forNode.startIndex,
  );

  ctx.link.syntaxToNode(forNode, entryNode);

  const chainBlocks = (entry: string | null, blocks: (BasicBlock | null)[]) => {
    let prevExit: string | null = entry;
    for (const block of blocks) {
      if (!block) continue;
      if (prevExit && block.entry) builder.addEdge(prevExit, block.entry);
      prevExit = block.exit;
    }
    return prevExit;
  };

  const afterInit = chainBlocks(entryNode, [initBlock]);
  if (afterInit) builder.addEdge(afterInit, headNode);

  if (condBlock) {
    builder.addEdge(headNode, condBlock.entry);
    if (condBlock.exit) {
      builder.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
      builder.addEdge(condBlock.exit, exitNode, "alternative");
    }
  } else {
    builder.addEdge(headNode, bodyBlock.entry, "consequence");
  }

  const afterBody = chainBlocks(bodyBlock.exit, [updateBlock]);
  if (afterBody) builder.addEdge(afterBody, headNode);

  matcher.state.forEachContinue((continueNode) => {
    if (updateBlock) {
      builder.addEdge(continueNode, updateBlock.entry);
    } else {
      builder.addEdge(continueNode, headNode);
    }
  }, ctx.extra?.label);

  matcher.state.forEachBreak((breakNode) => {
    builder.addEdge(breakNode, exitNode);
  }, ctx.extra?.label);

  return matcher.update({ entry: entryNode, exit: exitNode });
}

function getCases(switchSyntax: SyntaxNode): SyntaxNode[] {
  const switchBody = switchSyntax.childForFieldName("body");
  if (!switchBody) return [];
  return treeSitterNoNullNodes(switchBody.namedChildren).filter(
    (child) => child.type === "switch_section",
  );
}

function parseCase(caseSyntax: SyntaxNode): {
  isDefault: boolean;
  consequence: SyntaxNode[];
  hasFallthrough: boolean;
} {
  const children = treeSitterNoNullNodes(caseSyntax.namedChildren);
  // In C#, switch_section has one or more case/default labels followed by statements.
  // Labels are "case_switch_label" or "default_switch_label" in the AST.
  // Find the first non-label child as the start of the consequence.
  const labelTypes = new Set([
    "case_switch_label",
    "case_pattern_switch_label",
    "default_switch_label",
  ]);
  const labels: SyntaxNode[] = [];
  const consequence: SyntaxNode[] = [];
  for (const child of children) {
    if (labelTypes.has(child.type)) {
      labels.push(child);
    } else {
      consequence.push(child);
    }
  }
  const isDefault = labels.some((l) => l.type === "default_switch_label");
  return { isDefault, consequence, hasFallthrough: true };
}

function processSwitchStatement(
  switchSyntax: SyntaxNode,
  ctx: Context,
): BasicBlock {
  const blockHandler = ctx.matcher.state;

  const cases = collectCases(switchSyntax, ctx, { getCases, parseCase });
  const headNode = ctx.builder.addNode(
    "SWITCH_CONDITION",
    getChildFieldText(switchSyntax, "value"),
    switchSyntax.startIndex,
  );
  ctx.link.syntaxToNode(switchSyntax, headNode);
  const mergeNode = ctx.builder.addNode(
    "SWITCH_MERGE",
    "",
    switchSyntax.endIndex,
  );
  buildSwitch(cases, mergeNode, headNode, {}, ctx);

  blockHandler.forEachBreak((breakNode) => {
    ctx.builder.addEdge(breakNode, mergeNode);
  }, ctx.extra?.label);

  const switchBody = switchSyntax.childForFieldName("body");
  if (switchBody) {
    const braceMatch = ctx.matcher.match(
      switchBody,
      `(switch_body "{" @opening-brace "}" @closing-brace) @block`,
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
  }

  return blockHandler.update({ entry: headNode, exit: mergeNode });
}

function processTryStatement(trySyntax: SyntaxNode, ctx: Context): BasicBlock {
  const { builder, matcher } = ctx;

  const queryString = `
    (try_statement
      body: (_) @try-body
      ((catch_clause body: (_) @except-body) @except)*
      (finally_clause (_) @finally-body)? @finally
    ) @try
  `;

  const match = matcher.match(trySyntax, queryString);

  const bodySyntax = match.requireSyntax("try-body");
  const exceptSyntaxMany = match.getSyntaxMany("except-body");
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

    const exceptBlocks = exceptSyntaxMany.map((exceptSyntax) =>
      builder.withCluster("except", () => match.getBlock(exceptSyntax)),
    );
    for (const [syntax, block] of zip(
      match.getSyntaxMany("except"),
      exceptBlocks,
    )) {
      ctx.link.syntaxToNode(syntax, block.entry);
    }

    if (headNode) {
      for (const exceptBlock of exceptBlocks) {
        builder.addEdge(headNode, exceptBlock.entry, "exception");
      }
    }

    const finallyBlock = builder.withCluster("finally", () => {
      if (finallySyntax) {
        matcher.state.forEachFunctionExit((returnNode) => {
          const duplicateFinallyBlock = match.getBlock(finallySyntax);
          const functionExitCloneNode = builder.cloneNode(returnNode, {
            cluster: tryComplexCluster,
          });

          builder.addEdge(returnNode, duplicateFinallyBlock.entry);
          if (duplicateFinallyBlock.exit)
            builder.addEdge(duplicateFinallyBlock.exit, functionExitCloneNode);

          return functionExitCloneNode;
        });
      }

      const finallyBlock = match.getBlock(finallySyntax);
      return finallyBlock;
    });
    if (finallyBlock) {
      ctx.link.syntaxToNode(match.requireSyntax("finally"), finallyBlock.entry);
    }

    let happyExit: string | null = bodyBlock.exit;

    if (finallyBlock?.entry) {
      const toFinally = bodyBlock.exit;
      if (toFinally) builder.addEdge(toFinally, finallyBlock.entry);
      happyExit = finallyBlock.exit;
      for (const exceptBlock of exceptBlocks) {
        if (exceptBlock.exit)
          builder.addEdge(exceptBlock.exit, finallyBlock.entry);
      }
    } else {
      for (const exceptBlock of exceptBlocks) {
        if (exceptBlock.exit) builder.addEdge(exceptBlock.exit, mergeNode);
      }
    }

    if (happyExit) builder.addEdge(happyExit, mergeNode);

    return matcher.update({
      entry: bodyBlock.entry,
      exit: mergeNode,
    });
  });
}

function processLockStatement(
  lockSyntax: SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder, matcher } = ctx;
  const match = matcher.match(
    lockSyntax,
    `
    (lock_statement
      (expression) @lock
      (_) @body
    ) @sync
    `,
  );

  const lockExprSyntax = match.requireSyntax("lock");
  const lockBlock = match.getBlock(lockExprSyntax);

  return builder.withCluster("with", () => {
    const bodySyntax = match.requireSyntax("body");
    const bodyBlock = match.getBlock(bodySyntax);

    if (lockBlock.exit) builder.addEdge(lockBlock.exit, bodyBlock.entry);

    return matcher.state.update({
      entry: lockBlock.entry,
      exit: bodyBlock.exit,
    });
  });
}

function processUsingStatement(
  usingSyntax: SyntaxNode,
  ctx: Context,
): BasicBlock {
  const { builder, matcher } = ctx;
  const match = matcher.match(
    usingSyntax,
    `
    (using_statement
      body: (_) @body
    ) @using
    `,
  );

  const usingNode = builder.addNode(
    "STATEMENT",
    usingSyntax.text.split("\n")[0] ?? "using",
    usingSyntax.startIndex,
  );
  ctx.link.syntaxToNode(usingSyntax, usingNode);

  return builder.withCluster("with", () => {
    const bodySyntax = match.requireSyntax("body");
    const bodyBlock = match.getBlock(bodySyntax);

    builder.addEdge(usingNode, bodyBlock.entry);

    return matcher.state.update({
      entry: usingNode,
      exit: bodyBlock.exit,
    });
  });
}

const functionQuery = {
  methodDeclaration: "(method_declaration name: (identifier) @name)",
  constructorDeclaration: "(constructor_declaration name: (identifier) @name)",
  localFunctionStatement: "(local_function_statement name: (identifier) @name)",
  captureName: "name",
};

function extractCSharpFunctionName(func: SyntaxNode): string | undefined {
  switch (func.type) {
    case "method_declaration":
      return extractCapturedTextsByCaptureName(
        func,
        functionQuery.methodDeclaration,
        functionQuery.captureName,
      )[0];
    case "constructor_declaration":
      return extractCapturedTextsByCaptureName(
        func,
        functionQuery.constructorDeclaration,
        functionQuery.captureName,
      )[0];
    case "local_function_statement":
      return extractCapturedTextsByCaptureName(
        func,
        functionQuery.localFunctionStatement,
        functionQuery.captureName,
      )[0];
    case "lambda_expression":
      return findVariableBinding(func);
    case "accessor_declaration":
      return func.parent?.parent?.childForFieldName("name")?.text;
    default:
      return undefined;
  }
}

function findVariableBinding(func: SyntaxNode): string | undefined {
  const parent = func.parent;
  if (!parent) return undefined;
  switch (parent.type) {
    case "variable_declarator":
    case "equals_value_clause": {
      const declarator =
        parent.type === "equals_value_clause" ? parent.parent : parent;
      const name = declarator?.childForFieldName("name");
      return name?.type === "identifier" ? name.text : undefined;
    }
    case "assignment_expression": {
      const name = parent.childForFieldName("left");
      return name?.type === "identifier" ? name.text : undefined;
    }
    default:
      return undefined;
  }
}
