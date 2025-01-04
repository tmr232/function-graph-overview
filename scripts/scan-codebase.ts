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
import {
  fileTypes,
  getLanguage,
  iterFunctions,
} from "../src/file-parsing/bun.ts";
import { buildCFG } from "./cfg-helper.ts";
import { getFuncDef } from "./render-function.ts";

export function iterSourceFiles(root: string): IterableIterator<string> {
  const sourceGlob = new Glob(
    `**/*.{${fileTypes.map(({ ext }) => ext).join(",")}}`,
  );
  return sourceGlob.scanSync(root);
}
function* iterFilenames(
  root: string,
  dirsToInclude: string[],
): IterableIterator<string> {
  if (dirsToInclude.length === 1 && dirsToInclude[0] === "*") {
    yield* iterSourceFiles(root);
  } else {
    for (const dir of dirsToInclude) {
      for (const filename of iterSourceFiles(path.join(root, dir))) {
        // We want the path relative to the root
        yield path.join(dir, filename);
      }
    }
  }
}

async function* iterFunctionInfo(
  root: string,
  filenames: IterableIterator<string>,
): AsyncIterableIterator<{
  node_count: number;
  start_position: { row:number, column:number };
  funcdef: string;
  filename: string;
}> {
  for (const filename of filenames) {
    const code = await Bun.file(path.join(root, filename)).text();
    const language = getLanguage(filename);
    for (const func of iterFunctions(code, language)) {
      const cfg = buildCFG(func, language);
      yield {
        node_count: cfg.graph.order,
        start_position: func.startPosition,
        funcdef: getFuncDef(code, func),
        filename: filename.replaceAll("\\", "/"),
      };
    }
  }
}

async function generateIndex(
  /** Project name on GitHub */
  project: string,
  /** Git ref */
  ref: string,
  /** Root on local filesystem */
  root: string,
  /** Directories to index, relative to the root */
  dirsToInclude: string[],
) {
  const filenames = iterFilenames(root, dirsToInclude);
  const functions = await Array.fromAsync(iterFunctionInfo(root, filenames));
  return {
    version: 1,
    content: {
      index_type: "github",
      project,
      ref,
      functions,
    },
  };
}

async function main() {
  const {
    values,
    positionals: [_runtime, _this, ...dirsToInclude],
  } = parseArgs({
    args: Bun.argv,
    options: {
      project: {
        type: "string",
      },
      ref: {
        type: "string",
      },
      root: {
        type: "string",
      },
      out: {
        type: "string",
      },
    },
    strict: true,
    allowPositionals: true,
  });

  if (!values.project || !values.ref || !values.root) {
    throw new Error("Missing arguments");
  }

  const output = JSON.stringify(
    await generateIndex(values.project, values.ref, values.root, dirsToInclude),
  );
  if (values.out) {
    await Bun.write(values.out, output);
  } else {
    await Bun.write(Bun.stdout, output);
  }
}

if (require.main === module) {
  await main();
}
