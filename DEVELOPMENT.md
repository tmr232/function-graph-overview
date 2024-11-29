## Adding a New Language

### Add the Relevant Parser

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

[tree-sitter parsers]: https://github.com/tree-sitter/tree-sitter/wiki/List-of-parsers
[tree-sitter]: https://tree-sitter.github.io/tree-sitter/
[build-wasm]: https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/README.md#generate-wasm-language-files


### Generating the CFG

Each CFG-builder resides in its own file inside `./src/control-flow`.
Name yours `cfg-<language>.ts`.

Your builder is expected to expose a `createCFGBuilder(options: BuilderOptions): CFGBuilder` function.
A naive implementation to get started with would look something like this:

```typescript

```