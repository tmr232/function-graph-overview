import { $ } from "bun";

const treeSitter = Bun.file("./node_modules/web-tree-sitter/tree-sitter.wasm");
await Bun.write("./parsers/tree-sitter.wasm", treeSitter);

const parsers = ["tree-sitter-go", "tree-sitter-c"];

for (const name of parsers) {
  await $`bun x --bun tree-sitter build --wasm -o ./parsers/${name}.wasm ./node_modules/${name}/`;
}
