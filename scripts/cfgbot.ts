import * as process from "node:process";
import { AtpAgent, RichText } from "@atproto/api";
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import { $, Glob } from "bun";
import type { SyntaxNode } from "web-tree-sitter";
import {
  type ColorScheme,
  getDarkColorList,
  listToScheme,
} from "../src/control-flow/colors.ts";
import { graphToDot } from "../src/control-flow/render.ts";
import { fileTypes, getLanguage, iterFunctions } from "./file-parsing.ts";
import { type Language, newCFGBuilder } from "../src/control-flow/cfg.ts";
import { type CFG, mergeNodeAttrs } from "../src/control-flow/cfg-defs.ts";
import { simplifyCFG, trimFor } from "../src/control-flow/graph-ops.ts";
import path from "node:path";

async function main() {
  const password = process.env.BLUESKY_PASSWORD;
  const identifier = process.env.BLUESKY_IDENTIFIER;
  if (!password || !identifier) {
    console.error("No credentials provided");
    return;
  }

  const agent = new AtpAgent({ service: "https://bsky.social" });
  await agent.login({ identifier, password });

  const { png: imageData, text } = await preparePost(
    "C:\\Code\\sandbox\\function-graph-overview\\src",
  );

  // const imageData = await Bun.file(
  //   "C:\\Code\\sandbox\\function-graph-overview\\media\\screenshots\\color-scheme\\custom.png",
  // ).bytes();
  const response = await agent.uploadBlob(imageData, { encoding: "image/png" });
  if (!response.success) {
    throw new Error("Failed to upload image");
  }

  const richText = new RichText({ text });
  await richText.detectFacets(agent);

  const postResponse = await agent.post({
    text: richText.text,
    facets: richText.facets,
    embed: {
      $type: "app.bsky.embed.images",
      images: [
        {
          alt: "Control flow graph",
          image: response.data.blob,
        },
      ],
    },
  });

  console.log(postResponse.uri);
}

await main();

/*
1. Select function to render
  - Choose random file
  - Choose random function
  - If the function was used before, or is too boring - try again
2. Select color scheme
  - Randomly out of the options
3. Render the function
4. Post it, along with source attribution
 */

function normalizeFuncdef(funcdef: string): string {
  return funcdef
    .replaceAll("\r", "")
    .replaceAll("\n", " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function getFuncdef(sourceCode: string, func: SyntaxNode): string {
  const body = func.childForFieldName("body");
  if (!body) {
    return "";
  }
  return normalizeFuncdef(sourceCode.slice(func.startIndex, body.startIndex));
}

export function buildCFG(func: SyntaxNode, language: Language): CFG {
  const builder = newCFGBuilder(language, { flatSwitch: true });

  let cfg = builder.buildCFG(func);

  cfg = trimFor(cfg);
  cfg = simplifyCFG(cfg, mergeNodeAttrs);
  return cfg;
}

export function iterSourceFiles(root: string): IterableIterator<string> {
  const sourceGlob = new Glob(
    `**/*.{${fileTypes.map(({ ext }) => ext).join(",")}}`,
  );
  return sourceGlob.scanSync(root);
}

type Func = { file: string; func: SyntaxNode };

async function chooseFunction(
  root: string,
  isAlreadySeen: (file: string, func: SyntaxNode) => boolean,
  attempts = 5,
): Promise<Func | undefined> {
  const sourceFiles = Array.from(iterSourceFiles(root));

  for (let attempt = 0; attempt < attempts; attempt++) {
    const sourceFile =
      sourceFiles[Math.floor(Math.random() * sourceFiles.length)];
    if (!sourceFile) {
      continue;
    }
    const language = getLanguage(sourceFile);
    // const functions = Array.from(      iterFunctions(sourceFile, language),    );
    const code = await Bun.file(path.join(root, sourceFile)).text();
    const functions = [...iterFunctions(code, language)];
    const func = functions[Math.floor(Math.random() * functions.length)];
    if (!func) {
      continue;
    }
    if (!isAlreadySeen(sourceFile, func)) {
      return { file: sourceFile, func };
    }
  }
  return undefined;
}

function isAlreadySeen(file: string, func: SyntaxNode): boolean {
  const cfg = buildCFG(func, getLanguage(file));
  return cfg.graph.order < 5;
}

function chooseColorScheme(): ColorScheme {
  return listToScheme(getDarkColorList());
}

async function renderFunction(
  func: Func,
  colors: ColorScheme,
): Promise<Uint8Array> {
  const graphviz = await Graphviz.load();
  const cfg = buildCFG(func.func, getLanguage(func.file));
  const svg = graphviz.dot(graphToDot(cfg, false, undefined, colors));
  await Bun.write("cfgbot.svg", svg);
  await $`uvx --isolated --from cairosvg cairosvg cfgbot.svg -o cfgbot.png -s 5`;
  return Bun.file("cfgbot.png").bytes();
}

async function preparePost(
  root: string,
): Promise<{ png: Uint8Array; text: string }> {
  const func = await chooseFunction(root, isAlreadySeen, 100);
  if (!func) {
    throw new Error("No function found!");
  }

  const image = await renderFunction(func, chooseColorScheme());

  return { png: image, text: getFuncdef(await Bun.file(path.join(root, func.file)).text(), func.func) };
}
