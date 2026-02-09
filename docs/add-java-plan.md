# Plan: Adding Java Language Support

## Overview

Add Java as a supported language for control-flow graph generation, using [tree-sitter-java](https://github.com/tree-sitter/tree-sitter-java) for parsing and `@codemirror/lang-java` for editor highlighting in the demo.

Java's control-flow constructs closely mirror C/TypeScript: if/else, for, enhanced-for, while, do-while, switch, break, continue, return, throw, try/catch/finally, labeled statements. The C and TypeScript implementations are the best references.

## Implementation Checklist

### Phase 1: Parser Setup
- [x] **Step 1** — Install `tree-sitter-java` (dev) and `@codemirror/lang-java`
- [x] **Step 2** — Register parser in `scripts/generate-parsers.ts` (`parsersToBuild` array)
- [x] **Step 3** — Generate WASM: `bun generate-parsers`

### Phase 2: AST Exploration
- [x] **Step 4** — Write and run AST exploration scripts to dump the AST for representative Java code snippets, validating node types and field names before writing the CFG builder

### Phase 3: CFG Builder
- [x] **Step 5** — Create `src/control-flow/cfg-java.ts` with `javaLanguageDefinition` and all statement handlers (details below)

### Phase 4: Registration (8 touch points)
- [x] **Step 6** — `src/control-flow/cfg.ts`: Add `"Java"` to `supportedLanguages`, import `javaLanguageDefinition`, add to `languageDefinitions`
- [x] **Step 7** — `src/file-parsing/file-parsing.ts`: Add `{ ext: "java", language: "Java" }`
- [x] **Step 8** — `src/vscode/extension.ts`: Add `java: "Java"` to `languageMapping`
- [x] **Step 9** — `src/components/Demo.svelte` (3 spots): `defaultCodeSamples`, `languages` array, `languageAliases`
- [x] **Step 10** — `src/demo/src/App.svelte`: Import demo file, add to `code` object
- [x] **Step 11** — Create `src/demo/src/assets/demo.java` with example code

### Phase 5: Testing
- [ ] **Step 12** — Create `src/test/collect-java.ts` (test collector)
- [ ] **Step 13** — Register in `src/test/commentTestCollector.ts`
- [ ] **Step 14** — Create `src/test/commentTestSamples/sample.java` with test cases

### Phase 6: Per-Language Call Handlers
- [ ] **Step 15** — Add `System.exit` → TERMINATE in `src/control-flow/per-language-call-handlers.ts`

### Phase 7: Verification
- [ ] **Step 16** — `bun vitest run` — all tests pass
- [ ] **Step 17** — `bun lint` — no lint errors
- [ ] **Step 18** — `bun run build` — build succeeds

## AST Exploration Findings (Step 4)

Validated all tree-sitter queries against the actual Java WASM parser. Key findings:

1. **if_statement**: `condition` is `parenthesized_expression`, `consequence` and `alternative` are direct children (no `else_clause` wrapper like C/TypeScript). The `alternative` can be `if_statement` (else-if) or `block` (else). The `cStyleIfProcessor` query approach works with the right pattern — `alternative` captures match correctly with `([...])? @else`.

2. **for_statement**: The `init` field can be `local_variable_declaration` which *embeds its own semicolon*. This means the C-style query that matches `";" @init-semi` after init won't work. **Need a custom for handler** that uses `childForFieldName("init")` directly instead of the query-based approach from `cStyleForStatementProcessor`. The `condition`, `update`, `body`, `"("`, and `")"` are all queryable.

3. **enhanced_for_statement**: Fields are `type`, `name`, `value`, `body`. The `")"` token is available for `@closingParen`. Works with `forEachLoopProcessor`.

4. **switch_expression**: Used for both switch statements and expressions. Body is `switch_block` containing either `switch_block_statement_group` (traditional) or `switch_rule` (arrow). In traditional mode, each group has `switch_label` as first named child, then statement children. A "default" label has `namedChildCount: 0`. Fallthrough empty cases appear as separate groups with only a `switch_label`.

5. **try_statement / try_with_resources_statement**: `catch_clause` has a `body` field. `finally_clause` contains a `block` child (no `body` field). Both try forms share the same catch/finally structure.

6. **break_statement / continue_statement**: Optional `identifier` child for labels. Works with `labeledBreakProcessor`/`labeledContinueProcessor`.

7. **labeled_statement**: Has `identifier` and a statement as children, but no `label` field name — the label is accessed via `namedChildren[0]` (identifier) and `namedChildren[1]` (body statement). The common `processLabeledStatement` looks for `childForFieldName("label")` which won't work — **need a custom labeled statement handler**.

8. **constructor_declaration**: Has a `body` field of type `constructor_body` (not `block`). The `constructor_body` contains statements. Need to handle both `block` and `constructor_body` as statement sequences.

9. **Method/constructor name extraction**: `method_declaration` and `constructor_declaration` both have a `name` field (identifier).

## CFG Builder Design (Step 5 details)

### Function node types
- `method_declaration`
- `constructor_declaration`
- `compact_constructor_declaration` (records)
- `lambda_expression`

### Statement handler mapping

| Java construct | AST node type | Handler strategy |
|---|---|---|
| block | `block` | `processStatementSequence` |
| constructor body | `constructor_body` | `processStatementSequence` (same treatment) |
| if/else | `if_statement` | `cStyleIfProcessor` with Java-specific query (no `else_clause` wrapper) |
| for | `for_statement` | **Custom handler** — can't reuse `cStyleForStatementProcessor` because `init: local_variable_declaration` embeds its own `;` |
| enhanced for | `enhanced_for_statement` | `forEachLoopProcessor` |
| while | `while_statement` | `cStyleWhileProcessor()` |
| do-while | `do_statement` | `cStyleDoWhileProcessor()` |
| switch | `switch_expression` | **Custom handler** using `collectCases`/`buildSwitch` — Java has `switch_block_statement_group` (traditional) and `switch_rule` (arrow) |
| break | `break_statement` | `labeledBreakProcessor` (Java break can have labels) |
| continue | `continue_statement` | `labeledContinueProcessor` (Java continue can have labels) |
| return | `return_statement` | `processReturnStatement` |
| throw | `throw_statement` | `processThrowStatement` |
| try/catch/finally | `try_statement` | **Custom handler** modeled on TypeScript's `processTryStatement` |
| try-with-resources | `try_with_resources_statement` | Same custom try handler (shares catch/finally structure) |
| labeled statement | `labeled_statement` | **Custom handler** — no `label` field, uses `namedChildren[0]` for identifier |
| comments | `line_comment`, `block_comment` | `processComment` |

### Key AST differences from C/TypeScript

**if_statement**: Java has no `else_clause` wrapper. The `alternative` field directly contains the else statement (another `if_statement` for else-if, or a `block` for else). The `condition` field is a `parenthesized_expression`. This means the C/TypeScript `cStyleIfProcessor` query won't work directly — we need a custom query:
```
(if_statement
  condition: (parenthesized_expression ")" @closing-paren) @cond
  consequence: (_) @then
  alternative: ([
    (if_statement) @else-if
    (_) @else-body
  ])? @else
) @if
```
This needs validation via the AST exploration script.

**switch_expression**: Java uses `switch_expression` for both switch statements and expressions. The body is a `switch_block` containing either `switch_block_statement_group` (traditional `case X: ...`) or `switch_rule` (arrow `case X -> ...`). Traditional cases have fallthrough; arrow cases do not.

**try_statement**: Java's `catch_clause` has a `body` field (a `block`), and `finally_clause` contains a `block` child (no `body` field). Java also has `try_with_resources_statement` with a `resources` field.

**for_statement**: Java's `for_statement` has `init` (can be `local_variable_declaration` or expressions), `condition` (optional expression), `update` (expressions), `body`. The `init` field may contain a `local_variable_declaration` which embeds its own `;`, unlike C where `init` is a separate expression.

**break/continue**: Both can have an optional `identifier` child for labels.

**labeled_statement**: `identifier : statement` — no `label` field, just children. Need to verify exact structure.

### Function name extraction
- `method_declaration`: has `name` field (identifier)
- `constructor_declaration`: has `name` field (identifier)
- `compact_constructor_declaration`: has `name` field (identifier)
- `lambda_expression`: check parent for variable binding (like TypeScript)

## Execution Order

1. **Batch 1** (Steps 1-4): Parser install, WASM generation, AST exploration
2. **Batch 2** (Steps 5-11): CFG builder, all registrations, demo assets
3. **Batch 3** (Steps 12-18): Test infrastructure, call handlers, verification

The riskiest part is **Step 5** (CFG builder), specifically the if-statement query and switch handler, since Java's AST differs from C/TypeScript. Step 4 (AST exploration) is designed to de-risk this.
