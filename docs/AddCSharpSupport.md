# Adding C# Support — Implementation Plan

This document tracks the work required to add C# as a supported language.
C# is syntactically closest to Java, so `cfg-java.ts` serves as the primary reference implementation.

## Phase 1 — Parser Setup ✅

- [x] Install the tree-sitter parser: `bun add --dev tree-sitter-c-sharp`
- [x] Add `"tree-sitter-c-sharp"` to the `parsersToBuild` array in `scripts/generate-parsers.ts`
- [x] Run `bun generate-parsers` and confirm `parsers/tree-sitter-c_sharp.wasm` is created

**Learnings:**
- The WASM file is named `tree-sitter-c_sharp.wasm` (underscore, not hyphen) because the npm package uses that naming. Used the `{ package, name }` form in `parsersToBuild`: `{ package: "tree-sitter-c-sharp", name: "tree-sitter-c_sharp" }`.
- No prebuilt Docker/emscripten setup was needed — the package ships a prebuilt `.wasm` file that the generate-parsers script copies automatically.

## Phase 2 — CFG Builder ✅

- [x] Create `src/control-flow/cfg-csharp.ts`

### Language Definition

Export a `csharpLanguageDefinition` object with:

- `wasmPath` — `import treeSitterCSharp from "../../parsers/tree-sitter-c-sharp.wasm?url";`
- `createCFGBuilder(options)` — Returns `new GenericCFGBuilder(statementHandlers, options)`
- `functionNodeTypes` — Candidates (verify via [tree-sitter playground](https://tree-sitter.github.io/tree-sitter/playground)):
  - `method_declaration`
  - `constructor_declaration`
  - `local_function_statement`
  - `lambda_expression`
  - `accessor_declaration`
- `extractFunctionName` — Use `extractCapturedTextsByCaptureName` from `query-utils.ts`

### Statement Handlers

Map C# AST node types to handler functions. Reuse common patterns where possible.

| C# Construct | AST Node Type (expected) | Handler Strategy | Source |
|---|---|---|---|
| Block | `block` | `processStatementSequence` | `common-patterns.ts` |
| If / else if / else | `if_statement` | `cStyleIfProcessor(query)` | `common-patterns.ts` |
| For loop | `for_statement` | Custom (model on Java's `processForStatement`) | `cfg-java.ts` |
| Foreach loop | `for_each_statement` | `forEachLoopProcessor(definition)` | `common-patterns.ts` |
| While loop | `while_statement` | `cStyleWhileProcessor()` | `common-patterns.ts` |
| Do-while loop | `do_statement` | `cStyleDoWhileProcessor()` | `common-patterns.ts` |
| Switch | `switch_statement` | Custom using `collectCases`/`buildSwitch` | `switch-utils.ts`, `cfg-java.ts` |
| Break | `break_statement` | `processBreakStatement` | `common-patterns.ts` |
| Continue | `continue_statement` | `processContinueStatement` | `common-patterns.ts` |
| Return | `return_statement` | `processReturnStatement` | `common-patterns.ts` |
| Throw | `throw_statement` | `processThrowStatement` | `common-patterns.ts` |
| Try / catch / finally | `try_statement` | Custom (model on Java's `processTryStatement`) | `cfg-java.ts` |
| Lock | `lock_statement` | Custom (model on Java's `processSynchronizedStatement`) | `cfg-java.ts` |
| Using statement | `using_statement` | Custom cluster handler (similar to lock) | New |
| Goto | `goto_statement` | `processGotoStatement` | `common-patterns.ts` |
| Labeled statement | `labeled_statement` | `processLabeledStatement` | `common-patterns.ts` |
| Line comment | `comment` | `processComment` | `common-patterns.ts` |
| Block comment | `comment` | `processComment` | `common-patterns.ts` |

> **Note:** C# does not have labeled `break`/`continue` (unlike Java), so the plain versions from `common-patterns.ts` are sufficient.

**Learnings:**
- C# `if_statement` has `condition` as a direct expression field (not wrapped in `parenthesized_expression` like Java). The closing `)` is a direct anonymous child of `if_statement`. The `alternative` is a direct `statement` (no `else_clause` wrapper like TypeScript).
- C#'s `foreach_statement` uses `foreach` (no underscore), unlike Java's `enhanced_for_statement`.
- C#'s `for_statement` uses `initializer` field (not `init` like Java) and the init can be either `variable_declaration` or `commaSep1(expression)`.
- C# has a single `comment` node type for both `//` and `/* */` comments (Java has separate `line_comment` and `block_comment`).
- C#'s `switch_statement` uses `switch_body` (not `switch_block` like Java) containing `switch_section` nodes. Label types are `case_switch_label`, `case_pattern_switch_label`, and `default_switch_label`.
- `lock_statement` grammar: `lock (expression) statement` — simpler than Java's `synchronized_statement` which wraps the expression in `parenthesized_expression`.
- `using_statement` has a `body` field; modeled as a cluster handler similar to `lock`.
- `checked_statement` (for `checked { }` and `unchecked { }`) is control-flow transparent — mapped to `processStatementSequence`.
- `accessor_declaration` was added to `functionNodeTypes` for property getters/setters. Its name is extracted from the grandparent's `name` field.

## Phase 3 — Registration ✅

All locations marked with `ADD-LANGUAGES-HERE` in the codebase.

- [x] **`src/control-flow/cfg.ts`**
  - Add `"C#"` to `supportedLanguages` array
  - Import `csharpLanguageDefinition` from `./cfg-csharp`
  - Add `"C#": csharpLanguageDefinition` to `languageDefinitions`
- [x] **`src/file-parsing/file-parsing.ts`**
  - Add `{ ext: "cs", language: "C#" }` to `fileTypes`
- [x] **`src/vscode/extension.ts`**
  - Add `csharp: "C#"` to `languageMapping`
- [x] **`src/components/Demo.svelte`** (3 spots)
  - Add a default code sample to `defaultCodeSamples`
  - Add an entry to the `languages` array with `language`, `text`, and `codeMirror` factory
  - Add `csharp: "C#"` to `languageAliases`
- [x] **`src/demo/src/App.svelte`**
  - Import `demo.cs` raw file
  - Add `"C#": demoCodeCSharp` to the `code` object
- [x] **`src/control-flow/per-language-call-handlers.ts`**
  - Add `"C#": [{ pattern: "Environment.Exit", is: "TERMINATE" }]`

## Phase 4 — CodeMirror Language Support for Demo ✅

- [x] Install `@replit/codemirror-lang-csharp`: `bun add --dev @replit/codemirror-lang-csharp`
- [x] Wire it into the `languages` array in `src/components/Demo.svelte`

**Learnings:**
- `@replit/codemirror-lang-csharp` installed and worked without issues. No need for the `cpp()` fallback.

## Phase 5 — Demo Asset ✅

- [x] Create `src/demo/src/assets/demo.cs` — adapted the Java `Replace` demo to C# syntax (StringBuilder, IndexOf, etc.).

## Phase 6 — Test Infrastructure ✅

- [x] Create `src/test/collect-csharp.ts`
  - Modeled on `src/test/collect-java.ts`
  - Uses `initializeParser("C#")` from `src/parser-loader/bun.ts`
  - Tree-sitter query: `(comment) @comment (method_declaration name: (identifier) @name) @func` — uses `comment` (not `block_comment`) because C# has a single comment node type
  - Filters to only `/* */` block comments in the processing code to avoid matching `//` line comments
- [x] Register in `src/test/commentTestCollector.ts`
  - Import `getTestFuncs` from `./collect-csharp`
  - Add `{ ext: "cs", getTestFuncs: getTestsForCSharp }` to the `languages` array
- [x] Create `src/test/commentTestSamples/sample.cs`
  - Wrapped test functions in a `class Sample { }` (C# requires it)
  - Uses block-comment format for requirements (same as Java samples)
  - Covers: trivial, if, if-else, for, foreach, while, do-while, switch, many-ifs, return, throw, try-catch, try-catch-finally, break, continue

**Learnings:**
- C#'s simplified node counts differ slightly from initial expectations:
  - A bare `return;` function simplifies to 1 node (the return merges with the implicit end).
  - A bare `throw new Exception();` function has 2 nodes and 1 exit (the throw node + implicit return path).
  - `while(true) { break; }` produces 3 nodes (loop head, break, loop exit).
  - `while(x()) { if (y) { continue; } }` produces 6 nodes (the extra node vs Java-like expectations comes from C#'s different AST structure for the condition).
- C# switch cases with `break` statements do NOT fallthrough (unlike Java), so reachability tests between case bodies don't apply.

## Phase 7 — Verify ✅

- [x] `bun vitest run` — all 801 tests pass (683 comment tests + 118 other tests)
- [x] `bun lint` — clean (biome reordered one import in Demo.svelte)
- [ ] `bun demo` — not yet tested manually

---

## Open Challenges

These are C#-specific constructs that may require special handling beyond the initial implementation. Return to these once the basic support is working.

### Pattern Matching in Switch
C# supports pattern matching in switch cases (`case int x when x > 0:`, `case > 5`, `case Type t`). The Java-style case parsing may not cover these. The tree-sitter AST structure for pattern-matching cases needs investigation to determine whether `collectCases`/`parseCase` can be adapted or a fully custom switch handler is needed.

### Switch Expressions
C# 8+ introduces switch expressions (`var result = x switch { 1 => "one", _ => "other" };`). These are distinct from switch statements and may have a different AST node type. They may need a separate handler.

### Using Declarations vs Using Statements
C# 8+ has `using var x = ...;` (declaration, no block body — resource disposed at end of enclosing scope) in addition to `using (var x = ...) { }` (statement with a block body). The declaration form is simpler and could be treated as a plain statement, while the statement form needs a cluster handler like `lock`.

### Yield Return / Yield Break
`yield return value;` and `yield break;` are iterator constructs. `yield return` could map to the existing `YIELD` node type. `yield break` is semantically a function exit and should likely be handled similarly to `return`.

### Async / Await
`await` expressions are typically transparent to control flow — treat `await expr` as a regular expression/statement. No special CFG handling should be needed, but verify this assumption against the tree-sitter AST.

### Top-Level Statements
C# 9+ allows statements outside of methods in a single file. These may appear under a `compilation_unit` or `global_statement` AST node. Supporting this would mean adding that node type to `functionNodeTypes` or introducing a special handler. This is a lower-priority item since most C# code lives in methods.

### Checked / Unchecked Blocks
`checked { }` and `unchecked { }` blocks affect overflow behavior but are transparent to control flow. They should be handled by dispatching into their body (like `processStatementSequence`).
