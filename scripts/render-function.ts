import * as path from "node:path";
import { parseArgs } from "node:util";
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import type Parser from "web-tree-sitter";
import type { SyntaxNode } from "web-tree-sitter";
import { type Language, supportedLanguages } from "../src/control-flow/cfg.ts";
import {
  deserializeColorList,
  getDarkColorList,
  getLightColorList,
  listToScheme,
} from "../src/control-flow/colors.ts";
import { graphToDot } from "../src/control-flow/render.ts";
import { getLanguage, iterFunctions } from "../src/file-parsing/bun.ts";
import { buildCFG } from "./cfg-helper.ts";

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

export function getFuncDef(sourceCode: string, func: SyntaxNode): string {
  const body = func.childForFieldName("body");
  if (!body) {
    throw new Error("No function body");
  }
  return normalizeFuncdef(sourceCode.slice(func.startIndex, body.startIndex));
}

function writeError(message: string): void {
  Bun.write(Bun.stderr, `${message}\n`);
}

export async function getColorScheme(colors?: string) {
  if (!colors || colors === "dark") {
    return listToScheme(getDarkColorList());
  }
  if (colors === "light") {
    return listToScheme(getLightColorList());
  }
  return colors
    ? listToScheme(deserializeColorList(await Bun.file(colors).text()))
    : undefined;
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
      colors: {
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
  const startIndex = Number.parseInt(functionName);
  let startPosition: { row: number; column: number } | undefined;
  try {
    startPosition = JSON.parse(functionName);
  } catch {
    startPosition = undefined;
  }
  for (const func of iterFunctions(sourceCode, language)) {
    let funcDef: string;
    try {
      funcDef = getFuncDef(sourceCode, func);
    } catch {
      continue;
    }
    if (
      funcDef.includes(functionName) ||
      startIndex === func.startIndex ||
      (startPosition?.row === func.startPosition.row &&
        startPosition.column === func.startPosition.column)
    ) {
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

  const colorScheme = await getColorScheme(values.colors);

  const svg = graphviz.dot(graphToDot(cfg, false, colorScheme));

  if (values.out) {
    await Bun.write(values.out, svg);
  } else {
    await Bun.write(Bun.stdout, svg);
  }
}

if (require.main === module) {
  await main();
}
