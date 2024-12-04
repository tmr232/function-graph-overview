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
import { fileTypes, getLanguage, iterFunctions } from "./file-parsing.ts";

function iterSourceFiles(root: string): IterableIterator<string> {
  const sourceGlob = new Glob(
    `**/*.{${fileTypes.map(({ ext }) => ext).join(",")}}`,
  );
  return sourceGlob.scanSync(root);
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

  for (const filename of iterSourceFiles(root)) {
    const filepath = path.join(root, filename);
    const code = await Bun.file(filepath).text();
    const language = getLanguage(filename);
    for (const func of iterFunctions(code, language)) {
      const builder = newCFGBuilder(language, {});
      const cfg = builder.buildCFG(func);
      console.log(filepath, func.startPosition, cfg.graph.order);
    }
  }
}

await main();
