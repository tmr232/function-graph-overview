---
title: Adding a New Language
group: Documents
category: Guides
---

# Adding a New Language

## Add the Relevant Parser

We're using [tree-sitter] to parse code into ASTs.
Each language requires its own parser.
Find yours in [tree-sitter's list of parsers][tree-sitter parsers].

Once you find the parser, you need to install it:

```shell
bun add --dev tree-sitter-<language>
```

After installing it, add it to `./scripts/generate-parsers.ts`
and run `bun generate-parsers` to try and generate the `.wasm` parser file from it.

If the package contains a pre-built `.wasm` file, this will work.
If it fails, Follow the [tree-sitter instructions for generating .wasm language files][build wasm] to set up emsrcipten,
and run `bun generate-parsers` again.

Once the command completes successfully, your new parser should be inside `./parsers`.

## Generating the CFG

Each CFG-builder resides in its own file inside `./src/control-flow`.
Name yours `cfg-<language>.ts`.

Your builder is expected to expose a `createCFGBuilder(options: BuilderOptions): CFGBuilder` function.
A naive implementation to get started with would look something like this:

```typescript
import type Parser from "web-tree-sitter";
import type { BasicBlock, BuilderOptions, CFGBuilder } from "./cfg-defs";
import {
  type Context,
  GenericCFGBuilder,
  type StatementHandlers,
} from "./generic-cfg-builder.ts";

export function createCFGBuilder(options: BuilderOptions): CFGBuilder {
  return new GenericCFGBuilder(statementHandlers, options);
}

const statementHandlers: StatementHandlers = {
  named: {},
  default: defaultProcessStatement,
};

function defaultProcessStatement(
  syntax: Parser.SyntaxNode,
  ctx: Context,
): BasicBlock {
  const newNode = ctx.builder.addNode(
    "STATEMENT",
    syntax.text,
    syntax.startIndex,
  );
  ctx.link.syntaxToNode(syntax, newNode);
  return { entry: newNode, exit: newNode };
}
```

Once you have your initial builder file, there's quite a lot of wiring to do,
to register the language in all the relevant places.
Search for `ADD-LANGUAGES-HERE` in the code, and add the language in all the relevant places.
Those will include:

- Language & builder definitions in `src/control-flow/cfg.ts`
- Mapping languages to `.wasm` files in `src/components/parser-loader/wasmMappings.ts`
- Mapping VSCode's `languageId` to our language definitions in `src/vscode/extension.ts`
- Adding test-collectors and tests in `src/test/commentTestCollector.ts`
- Adding the language in the demo's UI in `src/components/Demo.svelte`

### Implementing the Builder

Once all the wiring is in place, it's time to actually generate the CFG.
It is highly recommended that you read the other CFG implementation for reference.

While you're working, the [tree-sitter playground] will prove highly valuable in understanding the AST
and creating queries.

[tree-sitter]: https://tree-sitter.github.io/tree-sitter/
[tree-sitter parsers]: https://github.com/tree-sitter/tree-sitter/wiki/List-of-parsers
[tree-sitter playground]: https://tree-sitter.github.io/tree-sitter/playground
[build-wasm]: https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/README.md#generate-wasm-language-files
