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
import { buildCFG } from "./cfg-helper.ts";
import {
  fileTypes,
  getLanguage,
  iterFunctions,
} from "../src/file-parsing/bun.ts";
import {getFuncDef} from "./render-function.ts";

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
      const cfg = buildCFG(func, language);
      yield {
        file: filename,
        startIndex: func.startIndex,
        nodeCount: cfg.graph.order,
        funcDef: getFuncDef(code, func),
        startPosition: func.startPosition,
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

  process.stdout.write(JSON.stringify(await Array.fromAsync(iterInfo(root))));
}

if (require.main === module) {
  await main();
}
