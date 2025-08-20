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

const functionQuery = {
  functionDefinitionOperator: `(function_definition
   declarator: (operator_cast
     type: (_) @name))`,

  functionDefinition: `(function_definition
   declarator: (function_declarator
     declarator: (_) @name))`,

  name: "name",
};

export function extractCppFunctionName(func: SyntaxNode): string | undefined {
  if (func.type === "function_definition") {
    const name = extractTaggedValueFromTreeSitterQuery(
      func,
      functionQuery.functionDefinitionOperator,
      functionQuery.name,
    )[0];
    return name === undefined
      ? extractTaggedValueFromTreeSitterQuery(
          func,
          functionQuery.functionDefinition,
          functionQuery.name,
        )[0]
      : `operator ${name}`;
  }
  return undefined;
}

// int*&   ref_to_ptr_global()   { static int v=42; static int* p=&v; static int*& r=p; return r; }        // -> ref_to_ptr_global
// int**   ptr_to_ptr_global()   { static int v=5;  static int* p=&v; static int** pp=&p; return pp; }     // -> ptr_to_ptr_global
// int***  ptr_to_ptr_to_ptr()   { static int v=1;  static int* p=&v; static int** pp=&p; return &pp; }    // -> ptr_to_ptr_to_ptr

// int&    ref_to_array_elem()   { static int arr[3]={1,2,3}; return arr[1]; }                             // -> ref_to_array_elem
// int (*  ptr_to_array())[3]    { static int arr[3]={7,8,9}; return &arr; }                               // -> ptr_to_array
// int (&  ref_to_array())[3]    { static int arr[3]={10,11,12}; return arr; }                             // -> ref_to_array

// int&&   rvalue_ref_global()   { static int v=2; return std::move(v); }                                  // -> rvalue_ref_global
// const int& const_ref_global() { static int v=3; return v; }                                             // -> const_ref_global
// volatile int* volatile_ptr()  { static volatile int v=4; return &v; }                                   // -> volatile_ptr
// const int*  const_ptr_global(){ static int v=5; return &v; }                                            // -> const_ptr_global

// int (*  array_of_func_ptrs()[2])(int) {
//   static int f1(int x){ return x+1; }                                                                  // -> f1
//   static int f2(int x){ return x+2; }                                                                  // -> f2
//   static int (*arr[2])(int)={f1,f2};
//   return arr;
// }                                                                                                      // -> array_of_func_ptrs

// int (&  array_ref_func())[2]  { static int arr[2]={7,8}; return arr; }                                 // -> array_ref_func

// int (*  func_returns_funcptr())(int) { static int inner(int x){ return x*2; } return inner; }           // -> func_returns_funcptr (+ inner)
// int (&  func_returns_funcref())(int) { static int impl(int x){ return x*3; } return impl; }             // -> func_returns_funcref (+ impl)

// int*    inner_return(int)      { static int v=77; return &v; }                                          // -> inner_return
// int* (* ptr_to_func_ret_ptr())(int) { return &inner_return; }                                           // -> ptr_to_func_ret_ptr

// int&    func_ref_impl(int& x)  { return x; }                                                            // -> func_ref_impl
// int (&  ref_to_func())(int&)   { return func_ref_impl; }                                                // -> ref_to_func

// struct PmfDemo { int f(int x){ return x+1; } int val; };                                                // -> f
// int (PmfDemo::* ptr_to_memfunc())(int) { return &PmfDemo::f; }                                          // -> ptr_to_memfunc
// int PmfDemo::* ptr_to_memvar()         { return &PmfDemo::val; }                                        // -> ptr_to_memvar

// int     takes_func_ptr(int (*f)(int)) { return f(5); }                                                  // -> takes_func_ptr
// int* (& ref_to_ptr_global2())()       { static int* p=nullptr; return p; }                              // -> ref_to_ptr_global2
// auto    auto_return_func() -> int*    { static int v=9; return &v; }                                    // -> auto_return_func

// int (*  complex_func(int (*f)(int)))(int) { return f; }                                                 // -> complex_func
