import type { Node as SyntaxNode } from "web-tree-sitter";
import treeSitterJava from "../../parsers/tree-sitter-java.wasm?url";
import type { BasicBlock, BuilderOptions, CFGBuilder } from "./cfg-defs";
import {
  cStyleDoWhileProcessor,
  cStyleIfProcessor,
  cStyleWhileProcessor,
  forEachLoopProcessor,
  getChildFieldText,
  labeledBreakProcessor,
  labeledContinueProcessor,
  processComment,
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
import { extractCapturedTextsByCaptureName } from "./query-utils.ts";
import { buildSwitch, collectCases } from "./switch-utils.ts";

export const javaLanguageDefinition = {
  wasmPath: treeSitterJava,
  createCFGBuilder: createCFGBuilder,
  functionNodeTypes: [
    "method_declaration",
    "constructor_declaration",
    "compact_constructor_declaration",
    "lambda_expression",
  ],
  extractFunctionName: extractJavaFunctionName,
};

const ifStatementQuery = `
  (if_statement
    condition: (parenthesized_expression ")" @closing-paren) @cond
    consequence: (_) @then
    alternative: ([
      (if_statement) @else-if
      (_) @else-body
    ])? @else
  ) @if
`;

const processIfStatement = cStyleIfProcessor(ifStatementQuery);

const processEnhancedForStatement = forEachLoopProcessor({
  query: `
    (enhanced_for_statement
      ")" @closingParen
      body: (_) @body
    ) @for
  `,
  body: "body",
  headerEnd: "closingParen",
});

const processBreakStatement = labeledBreakProcessor(`
  (break_statement (identifier)? @label)
`);

const processContinueStatement = labeledContinueProcessor(`
  (continue_statement (identifier)? @label)
`);

const statementHandlers: StatementHandlers = {
  named: {
    block: processStatementSequence,
    constructor_body: processStatementSequence,
    if_statement: processIfStatement,
    for_statement: processForStatement,
    enhanced_for_statement: processEnhancedForStatement,
    while_statement: cStyleWhileProcessor(),
    do_statement: cStyleDoWhileProcessor(),
    switch_expression: processSwitchExpression,
    break_statement: processBreakStatement,
    continue_statement: processContinueStatement,
    return_statement: processReturnStatement,
    throw_statement: processThrowStatement,
    try_statement: processTryStatement,
    try_with_resources_statement: processTryStatement,
    labeled_statement: processLabeledStatement,
    line_comment: processComment,
    block_comment: processComment,
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

  const initSyntax = forNode.childForFieldName("init");
  const condSyntax = forNode.childForFieldName("condition");
  const updateSyntax = forNode.childForFieldName("update");
  const bodySyntax = forNode.childForFieldName("body");

  if (!bodySyntax) {
    return defaultProcessStatement(forNode, ctx);
  }

  const initBlock = initSyntax ? ctx.dispatch.single(initSyntax) : null;
  const condBlock = condSyntax ? ctx.dispatch.single(condSyntax) : null;
  const updateBlock = updateSyntax ? ctx.dispatch.single(updateSyntax) : null;
  const bodyBlock = ctx.dispatch.single(bodySyntax);

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

const traditionalCaseTypes = new Set(["switch_block_statement_group"]);
const arrowCaseTypes = new Set(["switch_rule"]);

function getCases(switchSyntax: SyntaxNode): SyntaxNode[] {
  const switchBlock = switchSyntax.namedChildren.find(
    (child) => child?.type === "switch_block",
  );
  if (!switchBlock) return [];
  return treeSitterNoNullNodes(switchBlock.namedChildren).filter(
    (child) =>
      traditionalCaseTypes.has(child.type) || arrowCaseTypes.has(child.type),
  );
}

function parseCase(caseSyntax: SyntaxNode): {
  isDefault: boolean;
  consequence: SyntaxNode[];
  hasFallthrough: boolean;
} {
  if (caseSyntax.type === "switch_block_statement_group") {
    const label = caseSyntax.namedChildren[0];
    const isDefault =
      label?.type === "switch_label" && label.namedChildCount === 0;
    const consequence = treeSitterNoNullNodes(caseSyntax.namedChildren).slice(
      1,
    );
    return { isDefault, consequence, hasFallthrough: true };
  }
  const label = caseSyntax.namedChildren[0];
  const isDefault =
    label?.type === "switch_label" && label.namedChildCount === 0;
  const consequence = treeSitterNoNullNodes(caseSyntax.namedChildren).slice(1);
  return { isDefault, consequence, hasFallthrough: false };
}

function processSwitchExpression(
  switchSyntax: SyntaxNode,
  ctx: Context,
): BasicBlock {
  const blockHandler = ctx.matcher.state;

  const cases = collectCases(switchSyntax, ctx, { getCases, parseCase });
  const headNode = ctx.builder.addNode(
    "SWITCH_CONDITION",
    getChildFieldText(switchSyntax, "condition"),
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

  const switchBlock = switchSyntax.namedChildren.find(
    (child) => child?.type === "switch_block",
  );
  if (switchBlock) {
    const braceMatch = ctx.matcher.match(
      switchBlock,
      `(switch_block "{" @opening-brace "}" @closing-brace) @block`,
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

  const queryString =
    trySyntax.type === "try_with_resources_statement"
      ? `
    (try_with_resources_statement
      body: (_) @try-body
      (catch_clause body: (_) @except-body)? @except
      (finally_clause (_) @finally-body)? @finally
    ) @try
  `
      : `
    (try_statement
      body: (_) @try-body
      (catch_clause body: (_) @except-body)? @except
      (finally_clause (_) @finally-body)? @finally
    ) @try
  `;

  const match = matcher.match(trySyntax, queryString);

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

    const exceptBlock = builder.withCluster("except", () =>
      match.getBlock(exceptSyntax),
    );
    if (exceptBlock) {
      ctx.link.syntaxToNode(match.requireSyntax("except"), exceptBlock.entry);
      builder.addEdge(headNode, exceptBlock.entry, "exception");
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
      if (exceptBlock?.exit)
        builder.addEdge(exceptBlock.exit, finallyBlock.entry as string);
    } else {
      if (exceptBlock?.exit) builder.addEdge(exceptBlock.exit, mergeNode);
    }

    if (happyExit) builder.addEdge(happyExit, mergeNode);

    return matcher.update({
      entry: bodyBlock.entry,
      exit: mergeNode,
    });
  });
}

function processLabeledStatement(
  labelSyntax: SyntaxNode,
  ctx: Context,
): BasicBlock {
  const labelIdentifier = labelSyntax.namedChildren[0];
  const name = labelIdentifier?.text ?? "";
  const labelNode = ctx.builder.addNode("LABEL", name, labelSyntax.startIndex);
  ctx.link.syntaxToNode(labelSyntax, labelNode);
  const labelContentSyntax = labelSyntax.namedChildren[1];
  if (labelContentSyntax) {
    const { entry: labeledEntry, exit: labeledExit } = ctx.state.update(
      ctx.dispatch.single(labelContentSyntax, { label: name }),
    );
    if (labeledEntry) ctx.builder.addEdge(labelNode, labeledEntry);
    return ctx.state.update({
      entry: labelNode,
      exit: labeledExit,
      labels: new Map([[name, labelNode]]),
    });
  }
  return ctx.state.update({
    entry: labelNode,
    exit: labelNode,
    labels: new Map([[name, labelNode]]),
  });
}

const functionQuery = {
  methodDeclaration: "(method_declaration name: (identifier) @name)",
  constructorDeclaration: "(constructor_declaration name: (identifier) @name)",
  compactConstructorDeclaration:
    "(compact_constructor_declaration name: (identifier) @name)",
  captureName: "name",
};

function extractJavaFunctionName(func: SyntaxNode): string | undefined {
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
    case "compact_constructor_declaration":
      return extractCapturedTextsByCaptureName(
        func,
        functionQuery.compactConstructorDeclaration,
        functionQuery.captureName,
      )[0];
    case "lambda_expression":
      return findVariableBinding(func);
    default:
      return undefined;
  }
}

function findVariableBinding(func: SyntaxNode): string | undefined {
  const parent = func.parent;
  if (!parent) return undefined;
  switch (parent.type) {
    case "variable_declarator": {
      const name = parent.childForFieldName("name");
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
