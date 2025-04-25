import type { Node as SyntaxNode } from "web-tree-sitter";
import treeSitterGo from "../../parsers/tree-sitter-go.wasm?url";
import type { BasicBlock, BuilderOptions, CFGBuilder } from "./cfg-defs";
import {
  forEachLoopProcessor,
  getChildFieldText,
  labeledBreakProcessor,
  labeledContinueProcessor,
  processComment,
  processGotoStatement,
  processLabeledStatement,
  processReturnStatement,
  processStatementSequence,
} from "./common-patterns.ts";
import {
  extractNameByNodeType,
  extractTaggedValueFromTreeSitterQuery,
} from "./function-utils.ts";
import {
  type Context,
  GenericCFGBuilder,
  type StatementHandlers,
} from "./generic-cfg-builder";
import { treeSitterNoNullNodes } from "./hacks.ts";
import { type SwitchOptions, buildSwitch, collectCases } from "./switch-utils";

export const goLanguageDefinition = {
  wasmPath: treeSitterGo,
  createCFGBuilder: createCFGBuilder,
  functionNodeTypes: [
    "function_declaration",
    "method_declaration",
    "func_literal",
  ],
};

const processBreakStatement = labeledBreakProcessor(`
    (break_statement
        (label_name)? @label
    )
    `);

const processContinueStatement = labeledContinueProcessor(`
    (continue_statement
        (label_name)? @label
    )
`);

const statementHandlers: StatementHandlers = {
  named: {
    block: processStatementSequence,
    if_statement: processIfStatement,
    for_statement: processForStatement,
    expression_switch_statement: processSwitchStatement,
    type_switch_statement: processSwitchStatement,
    select_statement: processSelectStatement,
    return_statement: processReturnStatement,
    break_statement: processBreakStatement,
    continue_statement: processContinueStatement,
    labeled_statement: processLabeledStatement,
    goto_statement: processGotoStatement,
    comment: processComment,
    expression_statement: processExpressionStatement,
  },
  default: defaultProcessStatement,
};

export function createCFGBuilder(options: BuilderOptions): CFGBuilder {
  return new GenericCFGBuilder(statementHandlers, options);
}

function processSwitchStatement(syntax: SyntaxNode, ctx: Context): BasicBlock {
  return processSwitchlike(syntax, { noImplicitDefault: false }, ctx);
}

function processSelectStatement(syntax: SyntaxNode, ctx: Context): BasicBlock {
  return processSwitchlike(syntax, { noImplicitDefault: true }, ctx);
}

function processExpressionStatement(
  syntax: SyntaxNode,
  ctx: Context,
): BasicBlock {
  if (syntax.firstChild?.type === "call_expression") {
    const functionName = syntax.firstChild.childForFieldName("function")?.text;
    if (!functionName) {
      throw new Error("Missing callee in call expression!");
    }
    const callBlock = ctx.callProcessor?.(syntax, functionName, ctx);
    if (callBlock) {
      return callBlock;
    }
  }
  return defaultProcessStatement(syntax, ctx);
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
  const match = ctx.matcher.match(
    forNode,
    `
  (for_statement
      [
          (for_clause) @for_clause
          (range_clause) @range_clause
          (_) @expression
      ]?
      body: (_ "{" @open-body) @body
      (#not-eq? @expression @body)
  ) @for
  `,
  );
  if (match.getSyntax("for_clause")) {
    return processForClauseLoop(forNode, ctx);
  }
  if (match.getSyntax("range_clause")) {
    return forEachLoopProcessor({
      query: `
        (for_statement
          (range_clause) @range
          body: (_ "{" @open-body) @body
        ) @for
      `,
      body: "body",
      headerEnd: "open-body",
    })(forNode, ctx);
  }
  if (match.getSyntax("expression")) {
    return forEachLoopProcessor({
      query: `
        (for_statement
            (_) @expression
            body: (_ "{" @open-body) @body
        ) @for
      `,
      body: "body",
      headerEnd: "open-body",
    })(forNode, ctx);
  }
  // Infinite loop
  return processInfiniteLoop(ctx, forNode);
}

function processInfiniteLoop(ctx: Context, forNode: SyntaxNode) {
  const match = ctx.matcher.match(
    forNode,
    `
    (for_statement
        body: (_ "{" @open-body) @body
    ) @for
  `,
  );

  const bodySyntax = match.requireSyntax("body");
  const bodyBlock = match.getBlock(bodySyntax);

  if (bodyBlock.exit) ctx.builder.addEdge(bodyBlock.exit, bodyBlock.entry);

  const exitNode = ctx.builder.addNode(
    "LOOP_EXIT",
    "loop exit",
    forNode.endIndex,
  );

  ctx.state.forEachContinue((continueNode) => {
    ctx.builder.addEdge(continueNode, bodyBlock.entry);
  }, ctx.extra?.label);

  ctx.state.forEachBreak((breakNode) => {
    ctx.builder.addEdge(breakNode, exitNode);
  }, ctx.extra?.label);

  return ctx.state.update({ entry: bodyBlock.entry, exit: exitNode });
}

function processForClauseLoop(forNode: SyntaxNode, ctx: Context): BasicBlock {
  const match = ctx.matcher.match(
    forNode,
    `
        (for_statement
            (for_clause
                initializer: (_)? @init
                ";" @init-semi
                condition: (_)? @cond
                ";" @cond-semi
                update: (_)? @update
            ) @for_clause
            body: (_) @body
        ) @for
        `,
  );

  const initSyntax = match.getSyntax("init");
  const condSyntax = match.getSyntax("cond");
  const updateSyntax = match.getSyntax("update");
  const bodySyntax = match.requireSyntax("body");

  const initBlock = match.getBlock(initSyntax);
  const condBlock = match.getBlock(condSyntax);
  const updateBlock = match.getBlock(updateSyntax);
  const bodyBlock = match.getBlock(bodySyntax);

  const entryNode = ctx.builder.addNode(
    "EMPTY",
    "loop head",
    forNode.startIndex,
  );
  const exitNode = ctx.builder.addNode(
    "FOR_EXIT",
    "loop exit",
    forNode.endIndex,
  );
  const headNode = ctx.builder.addNode(
    "LOOP_HEAD",
    "loop head",
    forNode.startIndex,
  );
  const headBlock = { entry: headNode, exit: headNode };

  ctx.link.syntaxToNode(forNode, entryNode);
  if (condBlock) {
    ctx.link.syntaxToNode(match.requireSyntax("cond-semi"), condBlock.entry);
  }

  if (initSyntax)
    ctx.link.offsetToSyntax(initSyntax, match.requireSyntax("init-semi"), {
      reverse: true,
      includeTo: true,
    });
  if (condSyntax)
    ctx.link.offsetToSyntax(condSyntax, match.requireSyntax("cond-semi"), {
      reverse: true,
      includeTo: true,
    });
  if (!condSyntax && initSyntax)
    ctx.link.offsetToSyntax(initSyntax, match.requireSyntax("cond-semi"), {
      includeTo: true,
      reverse: true,
    });

  const chainBlocks = (entry: string | null, blocks: (BasicBlock | null)[]) => {
    let prevExit: string | null = entry;
    for (const block of blocks) {
      if (!block) continue;
      if (prevExit && block.entry) ctx.builder.addEdge(prevExit, block.entry);
      prevExit = block.exit;
    }
    return prevExit;
  };

  /*
  entry -> init -> cond +-> body -> head -> update -> cond
                        --> exit

  top = chain(entry, init,)

  if cond:
      chain(top, cond)
      cond +-> body
      cond --> exit
      chain(body, head, update, cond)
  else:
      chain(top, body, head, update, body)

  chain(continue, head)
  chain(break, exit)
  */
  const topExit = chainBlocks(entryNode, [initBlock]);
  if (condBlock) {
    chainBlocks(topExit, [condBlock]);
    if (condBlock.exit) {
      ctx.builder.addEdge(condBlock.exit, bodyBlock.entry, "consequence");
      ctx.builder.addEdge(condBlock.exit, exitNode, "alternative");
      chainBlocks(bodyBlock.exit ?? null, [headBlock, updateBlock, condBlock]);
    }
  } else {
    chainBlocks(topExit, [bodyBlock, headBlock, updateBlock, bodyBlock]);
  }

  ctx.matcher.state.forEachContinue((continueNode) => {
    ctx.builder.addEdge(continueNode, headNode);
  }, ctx.extra?.label);

  ctx.matcher.state.forEachBreak((breakNode) => {
    ctx.builder.addEdge(breakNode, exitNode);
  }, ctx.extra?.label);

  return ctx.matcher.update({ entry: entryNode, exit: exitNode });
}

function processIfStatement(
  ifNode: SyntaxNode,
  ctx: Context,
  mergeNode: string | null = null,
): BasicBlock {
  const conditionChild = ifNode.childForFieldName("condition");
  const conditionNode = ctx.builder.addNode(
    "CONDITION",
    conditionChild ? conditionChild.text : "Unknown condition",
    ifNode.startIndex,
  );
  ctx.link.syntaxToNode(ifNode, conditionNode);

  mergeNode ??= ctx.builder.addNode("MERGE", "MERGE", ifNode.endIndex);

  const consequenceChild = ifNode.childForFieldName(
    "consequence",
  ) as SyntaxNode;

  const { entry: thenEntry, exit: thenExit } = ctx.state.update(
    ctx.dispatch.single(consequenceChild),
  );
  ctx.link.syntaxToNode(consequenceChild, thenEntry);

  ctx.builder.addEdge(conditionNode, thenEntry || mergeNode, "consequence");
  if (thenExit) ctx.builder.addEdge(thenExit, mergeNode);

  const alternativeChild = ifNode.childForFieldName("alternative");
  if (alternativeChild) {
    ctx.link.offsetToSyntax(consequenceChild, alternativeChild);
    const elseIf = alternativeChild.type === "if_statement";
    const { entry: elseEntry, exit: elseExit } = (() => {
      if (elseIf) {
        return ctx.state.update(
          processIfStatement(alternativeChild, ctx, mergeNode),
        );
      }
      return ctx.state.update(ctx.dispatch.single(alternativeChild));
    })();

    if (elseEntry) {
      ctx.builder.addEdge(conditionNode, elseEntry, "alternative");
      if (elseExit && !elseIf) ctx.builder.addEdge(elseExit, mergeNode);
    }
  } else {
    ctx.builder.addEdge(conditionNode, mergeNode, "alternative");
  }

  return ctx.state.update({ entry: conditionNode, exit: mergeNode });
}

const caseTypes = new Set([
  "default_case",
  "communication_case",
  "type_case",
  "expression_case",
]);

function getCases(switchSyntax: SyntaxNode): SyntaxNode[] {
  return treeSitterNoNullNodes(switchSyntax.namedChildren).filter((child) =>
    caseTypes.has(child.type),
  );
}

function parseCase(caseSyntax: SyntaxNode): {
  isDefault: boolean;
  consequence: SyntaxNode[];
  hasFallthrough: boolean;
} {
  const isDefault = caseSyntax.type === "default_case";
  const consequence = treeSitterNoNullNodes(caseSyntax.namedChildren).slice(
    isDefault ? 0 : 1,
  );
  const hasFallthrough = consequence
    .map((node) => node.type)
    .includes("fallthrough_statement");
  return { isDefault, consequence, hasFallthrough };
}

function processSwitchlike(
  switchSyntax: SyntaxNode,
  options: SwitchOptions,
  ctx: Context,
): BasicBlock {
  const blockHandler = ctx.matcher.state;

  const cases = collectCases(switchSyntax, ctx, { parseCase, getCases });
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
  buildSwitch(cases, mergeNode, headNode, options, ctx);

  blockHandler.forEachBreak((breakNode) => {
    ctx.builder.addEdge(breakNode, mergeNode);
  });

  const braceMatch = ctx.matcher.match(
    switchSyntax,
    `(_ "{" @opening-brace "}" @closing-brace) @switch`,
    { maxStartDepth: 1 },
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

const nodeType = {
  // Function-related node types
  functionDeclaration: "function_declaration",
  methodDeclaration: "method_declaration",
  funcLiteral: "func_literal",

  // identifier lookups
  identifier: "identifier",
  fieldIdentifier: "field_identifier",

  // Unnamed functions
  anonymous: "<anonymous>",
};

const shortVarQueryAndTag = {
  query: `
    (short_var_declaration
      left: (expression_list
        (identifier) @var.name))
  `,
  tag: "var.name",
};

const varDeclarationQueryAndTag = {
  query: `
    (var_declaration
      (var_spec
        (identifier) @var.name))
  `,
  tag: "var.name",
};

const assignmentQueryAndTag = {
  query: `
    (assignment_statement
      left: (expression_list
        (identifier) @var.name))
  `,
  tag: "var.name",
};

export function extractGoFunctionName(func: SyntaxNode): string | undefined {
  switch (func.type) {
    case nodeType.functionDeclaration:
      return extractNameByNodeType(func, nodeType.identifier);
    case nodeType.methodDeclaration:
      return extractNameByNodeType(func, nodeType.fieldIdentifier);
    case nodeType.funcLiteral:
      // Check if the func_literal is assigned to a variable or is a standalone function
      return (
        extractTaggedValueFromTreeSitterQuery(
          func,
          shortVarQueryAndTag.query,
          shortVarQueryAndTag.tag,
        ) ||
        extractTaggedValueFromTreeSitterQuery(
          func,
          varDeclarationQueryAndTag.query,
          varDeclarationQueryAndTag.tag,
        ) ||
        extractTaggedValueFromTreeSitterQuery(
          func,
          assignmentQueryAndTag.query,
          assignmentQueryAndTag.tag,
        ) ||
        nodeType.anonymous
      );
    default:
      return undefined;
  }
}
