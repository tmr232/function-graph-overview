import * as path from "node:path";
/**
 * This script allows running the CFG builders on all the functions of a given
 * code base.
 * This can be useful in finding CFG generation bugs.
 *
 * @module
 */
import { parseArgs } from "node:util";
import { Glob } from "bun";
import { newCFGBuilder } from "../src/control-flow/cfg";
import { fileTypes, getFuncDef, getLanguage, iterFunctions } from "./file-parsing.ts";

export function iterSourceFiles(root: string): IterableIterator<string> {
  const sourceGlob = new Glob(
    `**/*.{${fileTypes.map(({ ext }) => ext).join(",")}}`,
  );
  return sourceGlob.scanSync(root);
}

async function* iterInfo(root: string) {
  for (const filename of iterSourceFiles(root)) {
    const filepath = path.join(root, filename);
    const code = await Bun.file(filepath).text();
    const language = getLanguage(filename);
    for (const func of iterFunctions(code, language)) {
      const builder = newCFGBuilder(language, {});
      const cfg = builder.buildCFG(func);
      yield {
        file: filename,
        startIndex: func.startIndex,
        nodeCount: cfg.graph.order,
        funcDef: getFuncDef(code, func),
      };
    }
  }
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv,
    options: {
      root: {
        type: "string",
      },
    },
    strict: true,
    allowPositionals: true,
  });

  const root = values.root ?? ".";
  console.log("[");
  for await (const entry of iterInfo(root)) {
    console.log(`${JSON.stringify(entry)},`);
  }
  console.log("]");
}

if (require.main === module) {
  await main();
}
