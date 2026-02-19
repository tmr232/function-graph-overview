# Adding C# Support — Implementation Plan

This document tracks the work required to add C# as a supported language.
C# is syntactically closest to Java, so `cfg-java.ts` serves as the primary reference implementation.

## Phase 1 — Parser Setup

- [ ] Install the tree-sitter parser: `bun add --dev tree-sitter-c-sharp`
- [ ] Add `"tree-sitter-c-sharp"` to the `parsersToBuild` array in `scripts/generate-parsers.ts`
- [ ] Run `bun generate-parsers` and confirm `parsers/tree-sitter-c-sharp.wasm` is created

## Phase 2 — CFG Builder

- [ ] Create `src/control-flow/cfg-csharp.ts`

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

## Phase 3 — Registration

All locations marked with `ADD-LANGUAGES-HERE` in the codebase.

- [ ] **`src/control-flow/cfg.ts`**
  - Add `"C#"` to `supportedLanguages` array
  - Import `csharpLanguageDefinition` from `./cfg-csharp`
  - Add `"C#": csharpLanguageDefinition` to `languageDefinitions`
- [ ] **`src/file-parsing/file-parsing.ts`**
  - Add `{ ext: "cs", language: "C#" }` to `fileTypes`
- [ ] **`src/vscode/extension.ts`**
  - Add `csharp: "C#"` to `languageMapping`
- [ ] **`src/components/Demo.svelte`** (3 spots)
  - Add a default code sample to `defaultCodeSamples`
  - Add an entry to the `languages` array with `language`, `text`, and `codeMirror` factory
  - Add `csharp: "C#"` to `languageAliases`
- [ ] **`src/demo/src/App.svelte`**
  - Import `demo.cs` raw file
  - Add `"C#": demoCodeCSharp` to the `code` object
- [ ] **`src/control-flow/per-language-call-handlers.ts`**
  - Add `"C#": [{ pattern: "Environment.Exit", is: "TERMINATE" }]`

## Phase 4 — CodeMirror Language Support for Demo

- [ ] Install `@replit/codemirror-lang-csharp`: `bun add --dev @replit/codemirror-lang-csharp`
  - If this package causes issues, fall back to `cpp()` from `@codemirror/lang-cpp` (already installed) — C# highlighting is reasonable with a C++ mode.
- [ ] Wire it into the `languages` array in `src/components/Demo.svelte`

## Phase 5 — Demo Asset

- [ ] Create `src/demo/src/assets/demo.cs` with sample C# code that exercises:
  - If / else if / else
  - For and foreach loops
  - While and do-while loops
  - Switch statement
  - Try / catch / finally
  - Return and throw
  - Lock and using statements

## Phase 6 — Test Infrastructure

- [ ] Create `src/test/collect-csharp.ts`
  - Model on `src/test/collect-java.ts`
  - Use `initializeParser("C#")` from `src/parser-loader/bun.ts`
  - Write a tree-sitter query to match `(block_comment) @comment (method_declaration name: (identifier) @name) @func`
- [ ] Register in `src/test/commentTestCollector.ts`
  - Import `getTestFuncs` from `./collect-csharp`
  - Add `{ ext: "cs", getTestFuncs: getTestFuncsForCSharp }` to the `languages` array
- [ ] Create `src/test/commentTestSamples/sample.cs`
  - Wrap test functions in a class (C# requires it)
  - Use block-comment format for requirements (same as Java samples)
  - Cover at minimum: trivial, if, if-else, for, foreach, while, do-while, switch, try-catch, return, break, continue

## Phase 7 — Verify

- [ ] `bun vitest run` — all existing tests still pass, new C# tests pass
- [ ] `bun lint` — no lint errors
- [ ] `bun demo` — C# appears in the language dropdown and renders CFGs correctly

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
