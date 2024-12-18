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

function isString(value: unknown): value is string {
  return typeof value === "string" || value instanceof String;
}

type Location = { package: string; name: string };
function asLocation(entry: string | Location): Location {
  if (isString(entry)) {
    return { package: entry, name: entry };
  }
  return entry;
}

/**
 * The parsers to include
 */
const parsersToBuild: (Location | string)[] = [
  "tree-sitter-go",
  "tree-sitter-c",
  "tree-sitter-python",
  "tree-sitter-cpp",
  "tree-sitter-typescript",
  { package: "tree-sitter-typescript", name: "tree-sitter-tsx" },
];

function locatePrebuiltWasm(location: Location): string {
  return fileURLToPath(
    import.meta.resolve(`${location.package}/${location.name}.wasm`),
  );
}

function hasPrebuiltWasm(location: Location): boolean {
  try {
    locatePrebuiltWasm(location);
  } catch {
    return false;
  }
  return true;
}

for (const location of parsersToBuild.map(asLocation)) {
  const targetWasmPath = `./parsers/${location.name}.wasm`;
  if (await Bun.file(targetWasmPath).exists()) {
    console.log(`${location.name}: .wasm found, skipping copy.`);
  } else if (hasPrebuiltWasm(location)) {
    console.log(`${location.name}: copying .wasm`);
    fs.copyFileSync(locatePrebuiltWasm(location), targetWasmPath);
  } else {
    console.log(`${location.name}: building .wasm`);
    await $`bun x --bun tree-sitter build --wasm -o ${targetWasmPath} ./node_modules/${location.package}/`;
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
