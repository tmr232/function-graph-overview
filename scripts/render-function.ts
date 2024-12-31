import * as path from "node:path";
import { parseArgs } from "node:util";
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import type Parser from "web-tree-sitter";
import { type CFG, mergeNodeAttrs } from "../src/control-flow/cfg-defs.ts";
import {
  type Language,
  newCFGBuilder,
  supportedLanguages,
} from "../src/control-flow/cfg.ts";
import { simplifyCFG, trimFor } from "../src/control-flow/graph-ops.ts";
import { graphToDot } from "../src/control-flow/render.ts";
import { getLanguage, iterFunctions } from "../src/file-parsing/bun.ts";

function isLanguage(language: string): language is Language {
  return supportedLanguages.includes(language as Language);
}

function normalizeFuncdef(funcdef: string): string {
  return funcdef
    .replaceAll("\r", "")
    .replaceAll("\n", " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function buildCFG(func: Parser.SyntaxNode, language: Language): CFG {
  const builder = newCFGBuilder(language, { flatSwitch: true });

  let cfg = builder.buildCFG(func);

  cfg = trimFor(cfg);
  cfg = simplifyCFG(cfg, mergeNodeAttrs);
  return cfg;
}

function writeError(message: string): void {
  Bun.write(Bun.stderr, `${message}\n`);
}

async function main() {
  process.on("SIGINT", () => {
    // close watcher when Ctrl-C is pressed
    writeError("Terminated by user.");

    process.exit(0);
  });

  const {
    values,
    positionals: [_runtime, _this, filepath, functionName],
  } = parseArgs({
    args: Bun.argv,
    options: {
      language: {
        type: "string",
      },
      out: {
        type: "string",
      },
    },
    strict: true,
    allowPositionals: true,
  });

  if (filepath === undefined || functionName === undefined) {
    writeError(
      `Usage: bun run ${path.relative(process.cwd(), import.meta.path)} [--language LANGUAGE] [--out PATH] <source-file> <function-identifier>`,
    );
    process.exit(1);
  }

  if (values.language !== undefined && !isLanguage(values.language)) {
    writeError(`Language must be one of ${supportedLanguages}`);
    process.exit(1);
  }

  const language: Language = values.language ?? getLanguage(filepath);

  const possibleMatches: { name: string; func: Parser.SyntaxNode }[] = [];
  const sourceCode = await Bun.file(filepath).text();
  for (const func of iterFunctions(sourceCode, language)) {
    const body = func.childForFieldName("body");
    if (!body) {
      continue;
    }
    const funcDef = normalizeFuncdef(
      sourceCode.slice(func.startIndex, body.startIndex),
    );
    if (funcDef.includes(functionName)) {
      possibleMatches.push({ name: funcDef, func: func });
    }
  }

  if (possibleMatches.length === 0) {
    writeError("No matches found.");
    process.exit(1);
  }
  if (possibleMatches.length !== 1) {
    writeError("Multiple matches found, please be more specific:");
    for (const { name } of possibleMatches) {
      writeError(`\t${name}`);
    }
    process.exit(1);
  }

  // @ts-expect-error: possibleMatches will always have exactly one value.
  const func: Parser.SyntaxNode = possibleMatches[0].func;
  const graphviz = await Graphviz.load();
  const cfg = buildCFG(func, language);
  const svg = graphviz.dot(graphToDot(cfg));

  if (values.out) {
    await Bun.write(values.out, svg);
  } else {
    await Bun.write(Bun.stdout, svg);
  }
}

await main();
