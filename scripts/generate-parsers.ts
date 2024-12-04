import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
/**
 * The `generate-parsers` script copies or builds the relevant tree-sitter
 * parsers in to the `./parsers` directory.
 *
 * To add a new parsers, add it's package name to the `parsersToBuild` array.
 * @module
 */
import { $ } from "bun";

/**
 * The parsers to include
 */
const parsersToBuild = [
  "tree-sitter-go",
  "tree-sitter-c",
  "tree-sitter-python",
  "tree-sitter-cpp",
];

function locatePrebuiltWasm(packageName: string): string {
  return fileURLToPath(
    import.meta.resolve(`${packageName}/${packageName}.wasm`),
  );
}

function hasPrebuiltWasm(packageName: string): boolean {
  try {
    locatePrebuiltWasm(packageName);
  } catch {
    return false;
  }
  return true;
}

for (const name of parsersToBuild) {
  const targetWasmPath = `./parsers/${name}.wasm`;
  if (await Bun.file(targetWasmPath).exists()) {
    console.log(`${name}: .wasm found, skipping copy.`);
  } else if (hasPrebuiltWasm(name)) {
    console.log(`${name}: copying .wasm`);
    fs.copyFileSync(locatePrebuiltWasm(name), targetWasmPath);
  } else {
    console.log(`${name}: building .wasm`);
    await $`bun x --bun tree-sitter build --wasm -o ${targetWasmPath} ./node_modules/${name}/`;
  }

  await $`git add ${targetWasmPath}`;
}

const treeSitterPath = "./parsers/tree-sitter.wasm";
if (!(await Bun.file(treeSitterPath).exists())) {
  const treeSitter = Bun.file(
    "./node_modules/web-tree-sitter/tree-sitter.wasm",
  );
  await Bun.write(treeSitterPath, treeSitter);
  await $`git add ${treeSitterPath}`;
}
