# AGENTS.md

## Project Overview

Function-Graph-Overview generates control-flow graphs (CFGs) from source code. It runs as a VSCode extension and a web demo. It uses **tree-sitter** WASM parsers to produce ASTs, then walks them with language-specific statement handlers to build CFGs.

## Commands

- **Install**: `bun install`
- **Test**: `bun vitest run`
- **Lint & format**: `bun lint`
- **Dev server (web demo)**: `bun demo`
- **Generate parsers**: `bun generate-parsers`
- **Build**: `bun run build` (check package.json for exact scripts)

## Platform Notes

This project uses **bun** as its JavaScript runtime, package manager, and script runner — not npm or node. Use `bun` in place of `npm run`, `npx`, and `node` for all commands (e.g., `bun install`, `bun vitest run`, `bun run build`).

On Windows, bun runs commands via PowerShell. Unix utilities like `tail`, `head`, `grep` are not available — use PowerShell equivalents or omit them. Pipe bun command output directly without filters (e.g., `bun vitest run 2>&1` not `bun vitest run 2>&1 | tail -30`).

## Supported Languages

C, C++, Go, Java, Python, TypeScript, TSX.

Each language has a `cfg-<lang>.ts` file in `src/control-flow/`.

## Architecture: How CFGs Are Built

### Core Types (src/control-flow/cfg-defs.ts)

- **`BasicBlock`** — The fundamental unit of CFG construction. Has `entry` (node ID), `exit` (node ID or null), plus optional `breaks`, `continues`, `gotos`, `labels`, `functionExits`.
- **`CFG`** — Final result: `{ graph, entry, offsetToNode }`.
- **`CFGGraph`** — A `MultiDirectedGraph<GraphNode, GraphEdge>` from graphology.
- **`GraphNode`** — Has `type: NodeType`, `code`, `lines`, `markers`, `cluster`, `targets`, `startOffset`.
- **`NodeType`** — One of: `START`, `END`, `STATEMENT`, `CONDITION`, `RETURN`, `BREAK`, `CONTINUE`, `MERGE`, `LOOP_HEAD`, `FOR_EXIT`, `SWITCH_CONDITION`, `CASE_CONDITION`, `SWITCH_MERGE`, `THROW`, `YIELD`, `GOTO`, `LABEL`, `EMPTY`, etc.
- **`EdgeType`** — `regular`, `consequence`, `alternative`, `exception`.
- **`BlockHandler`** — Collects breaks/continues/gotos/functionExits from child blocks and provides `forEachBreak`, `forEachContinue`, `forEachFunctionExit`, `processGotos` methods.
- **`BuilderOptions`** — `{ flatSwitch?, markerPattern?, callProcessor? }`.

### GenericCFGBuilder (src/control-flow/generic-cfg-builder.ts)

The shared engine all languages use. Constructed with `StatementHandlers` + `BuilderOptions`.

- **`StatementHandlers`** — `{ named: { [nodeType: string]: StatementHandler }, default: StatementHandler }`. Maps tree-sitter AST node type names to handler functions.
- **`StatementHandler`** — `(syntax: SyntaxNode, ctx: Context) => BasicBlock`. Converts one AST node into a CFG fragment.
- **`Context`** — `{ builder, options, matcher, dispatch, state, link, extra?, callProcessor? }`. Passed to every handler.
  - `builder` (Builder) — Adds nodes/edges to the graph.
  - `matcher` (BlockMatcher) — Runs tree-sitter queries on AST nodes to extract sub-nodes.
  - `dispatch.single(syntax)` / `dispatch.many(statements, parent)` — Recursively process child AST nodes.
  - `state` (BlockHandler) — Tracks breaks/continues/gotos for the current scope.
  - `link.syntaxToNode()` / `link.offsetToSyntax()` — Maps source offsets to CFG nodes.

**`buildCFG(functionNode)`** flow:
1. Creates a `START` node.
2. Gets `functionNode.childForFieldName("body")`.
3. Calls `dispatchMany` on the body's named children.
4. Resolves gotos, creates implicit `RETURN` node, links edges.

**`dispatchMany(statements)`** — Filters out non-marker comments, calls `dispatchSingle` per statement, chains blocks (exit→entry edges).

**`dispatchSingle(syntax)`** — Looks up `handlers.named[syntax.type]` or falls back to `handlers.default`.

### LanguageDefinition (src/control-flow/cfg.ts)

Each language exports a `LanguageDefinition`:
```typescript
{
  wasmPath: string;              // import of parsers/tree-sitter-<lang>.wasm?url
  createCFGBuilder: (options: BuilderOptions) => CFGBuilder;
  functionNodeTypes: string[];   // AST types representing functions
  extractFunctionName: (node: SyntaxNode) => string | undefined;
}
```

Registered in `languageDefinitions: Record<Language, LanguageDefinition>` in `src/control-flow/cfg.ts`.

### Common Patterns (src/control-flow/common-patterns.ts)

Reusable handler factories for common control-flow constructs:

- **`cStyleIfProcessor(query)`** — C/C++/TS-style if/else-if/else chains.
- **`cStyleForStatementProcessor(query)`** — C-style `for(init;cond;update)` loops.
- **`cStyleWhileProcessor()`** — `while(cond) body` loops.
- **`cStyleDoWhileProcessor()`** — `do body while(cond)` loops.
- **`forEachLoopProcessor(definition)`** — Range/for-each loops (Go `for range`, Python `for in`, TS `for of`).
- **`labeledBreakProcessor(query)` / `labeledContinueProcessor(query)`** — Break/continue with optional labels.
- **`processReturnStatement`**, **`processBreakStatement`**, **`processContinueStatement`** — Simple flow-exit handlers.
- **`processGotoStatement`**, **`processLabeledStatement`** — Goto/label support.
- **`processStatementSequence`** — Dispatches all named children of a block node.
- **`processComment`** — Handles marker comments for testing.
- **`processThrowStatement`** — Throw/raise with `functionExits`.

Each factory takes a **tree-sitter query string** that captures the relevant sub-parts of the AST node (e.g., `@cond`, `@body`, `@then`, `@else`).

### BlockMatcher (src/control-flow/block-matcher.ts)

Wraps tree-sitter queries. Usage pattern:
```typescript
const match = ctx.matcher.match(syntax, queryString);
const bodySyntax = match.requireSyntax("body");
const bodyBlock = match.getBlock(bodySyntax);  // recursively dispatches
```
- `match.getSyntax(name)` — Optional capture.
- `match.requireSyntax(name)` — Required capture (throws if missing).
- `match.getSyntaxMany(name)` — Multiple captures.
- `match.getBlock(syntax)` — Dispatches the syntax node and returns its BasicBlock.

### Switch Utilities (src/control-flow/switch-utils.ts)

Shared logic for switch/select/match statements: `collectCases`, `buildSwitch`.

### Per-Language Call Handlers (src/control-flow/per-language-call-handlers.ts)

Special handling for specific function calls (e.g., `panic` in Go → TERMINATE, `sys.exit` in Python → TERMINATE).

## Adding a New Language — Complete Checklist

Also see: `docs/AddNewLanguage.md`

### 1. Install the tree-sitter parser
```shell
bun add --dev tree-sitter-<language>
```

### 2. Register the parser in scripts/generate-parsers.ts
Add `"tree-sitter-<language>"` to the `parsersToBuild` array (line ~27).

### 3. Generate the WASM parser
```shell
bun generate-parsers
```
This copies/builds the `.wasm` file into `./parsers/`.

### 4. Create src/control-flow/cfg-<language>.ts
Export a `<language>LanguageDefinition` object with:
- `wasmPath` — `import treeSitter<Lang> from "../../parsers/tree-sitter-<lang>.wasm?url";`
- `createCFGBuilder(options)` — Returns `new GenericCFGBuilder(statementHandlers, options)`
- `functionNodeTypes` — Array of AST node types representing functions (check tree-sitter playground)
- `extractFunctionName(node)` — Uses `extractCapturedTextsByCaptureName` from `query-utils.ts`

Define `statementHandlers: StatementHandlers` mapping AST node types to handlers. Reuse common patterns from `common-patterns.ts` where possible. Write custom handlers for language-specific constructs.

Starter template:
```typescript
import type { Node as SyntaxNode } from "web-tree-sitter";
import treeSitter<Lang> from "../../parsers/tree-sitter-<lang>.wasm?url";
import type { BasicBlock, BuilderOptions, CFGBuilder } from "./cfg-defs";
import { type Context, GenericCFGBuilder, type StatementHandlers } from "./generic-cfg-builder.ts";

export const <lang>LanguageDefinition = {
  wasmPath: treeSitter<Lang>,
  createCFGBuilder,
  functionNodeTypes: ["function_definition"],  // adjust per language
  extractFunctionName: extract<Lang>FunctionName,
};

const statementHandlers: StatementHandlers = {
  named: {
    // Map AST node type names to handler functions
  },
  default: defaultProcessStatement,
};

function createCFGBuilder(options: BuilderOptions): CFGBuilder {
  return new GenericCFGBuilder(statementHandlers, options);
}

function defaultProcessStatement(syntax: SyntaxNode, ctx: Context): BasicBlock {
  const newNode = ctx.builder.addNode("STATEMENT", syntax.text, syntax.startIndex);
  ctx.link.syntaxToNode(syntax, newNode);
  return { entry: newNode, exit: newNode };
}
```

### 5. Register in src/control-flow/cfg.ts (ADD-LANGUAGES-HERE)
- Add to `supportedLanguages` array
- Import your language definition
- Add to `languageDefinitions` record

### 6. Register in src/file-parsing/file-parsing.ts (ADD-LANGUAGES-HERE)
Add `{ ext: "<ext>", language: "<Language>" }` entries to `fileTypes`.

### 7. Register in src/vscode/extension.ts (ADD-LANGUAGES-HERE)
Add VSCode `languageId` → Language mapping to `languageMapping`.

### 8. Register in src/components/Demo.svelte (ADD-LANGUAGES-HERE, 3 spots)
- `defaultCodeSamples` — Add a default code snippet
- `languages` array — Add entry with `language`, `text`, and `codeMirror` factory
- `languageAliases` — Add lowercase alias

### 9. Register in src/demo/src/App.svelte (ADD-LANGUAGES-HERE)
- Import a demo file: `import demoCode<Lang> from "./assets/demo.<ext>?raw";`
- Add to `code` object
- Create `src/demo/src/assets/demo.<ext>` with example code

### 10. Add test infrastructure
- Create `src/test/collect-<language>.ts` — Parses test files and yields `TestFunction` objects. Use `initializeParser("<Language>")` from `src/parser-loader/bun.ts`. Pattern: parse the file, find function nodes preceded by comments, extract requirements from comment JSON.
- Register in `src/test/commentTestCollector.ts` (ADD-LANGUAGES-HERE) — Add to the `languages` array with `{ ext, getTestFuncs }`.
- Create test samples in `src/test/commentTestSamples/sample.<ext>` — Functions preceded by comment blocks containing JSON-like requirements (`nodes`, `exits`, `reaches`, `render`).

### 11. Optionally add per-language call handlers
In `src/control-flow/per-language-call-handlers.ts`, add entries for functions that terminate the process (e.g., `panic`, `sys.exit`).

## Comment-Test Format

Tests are defined as source code files where each function is preceded by a comment containing requirements:

**Go/C/C++ style** (block comments):
```go
/*
nodes: 3,
exits: 1,
reaches: [["A", "B"]],
render: true
*/
func example() { ... }
```

**Python style** (line comments):
```python
# nodes: 3,
# exits: 1
def example():
    ...
```

Requirements fields (all optional):
- `nodes` — Expected number of CFG nodes (simplified, if-chain switch)
- `flatNodes` — Expected nodes with flat switch rendering
- `exits` — Expected number of exit nodes
- `reaches` — `[["source_marker", "target_marker"]]` pairs for reachability assertions
- `flatReaches` — Same as reaches but for flat switch mode
- `unreach` — `[["source_marker", "target_marker"]]` pairs for unreachability assertions
- `render` — `true` to require rendering to succeed

Markers are placed with comments containing `CFG: <marker_name>` in the source code.

## Key Design Patterns

1. **Tree-sitter queries** are the primary mechanism for extracting AST structure. Use the [tree-sitter playground](https://tree-sitter.github.io/tree-sitter/playground) to understand the AST and write queries.
2. **BasicBlock chaining** — Each handler returns a `BasicBlock` with entry/exit. The framework chains them. Returning `exit: null` means the block diverts control flow (return, break, continue, throw).
3. **BlockHandler accumulation** — Call `ctx.state.update(block)` to accumulate breaks/continues/gotos, then resolve them at loop/switch boundaries with `forEachBreak`, `forEachContinue`, etc.
4. **Clusters** — Used for try/except/finally rendering. Created via `builder.withCluster(type, callback)`.
5. **Offset mapping** — `link.syntaxToNode` and `link.offsetToSyntax` maintain mappings between source positions and CFG nodes for navigation.
