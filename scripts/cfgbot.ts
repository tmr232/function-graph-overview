import path from "node:path";
import * as process from "node:process";
import { AtpAgent, RichText, UnicodeString } from "@atproto/api";
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import { $, Glob } from "bun";
import type { SyntaxNode } from "web-tree-sitter";
import { type CFG, mergeNodeAttrs } from "../src/control-flow/cfg-defs.ts";
import { type Language, newCFGBuilder } from "../src/control-flow/cfg.ts";
import {
  type ColorScheme,
  getDarkColorList,
  listToScheme,
} from "../src/control-flow/colors.ts";
import { simplifyCFG, trimFor } from "../src/control-flow/graph-ops.ts";
import { graphToDot } from "../src/control-flow/render.ts";
import { fileTypes, getLanguage, iterFunctions } from "./file-parsing.ts";
import { buildCFG } from "./cfg-helper.ts";

async function main() {
  const password = process.env.BLUESKY_PASSWORD;
  const identifier = process.env.BLUESKY_IDENTIFIER;
  if (!password || !identifier) {
    console.error("No credentials provided");
    return;
  }

  const agent = new AtpAgent({ service: "https://bsky.social" });
  await agent.login({ identifier, password });

  const {
    png: imageData,
    text,
    alt,
    link,
  } = await preparePost(
    // "C:\\Code\\sandbox\\function-graph-overview\\src",
    "C:\\Temp\\2024-12-29-glibc\\glibc",
  );

  // const imageData = await Bun.file(
  //   "C:\\Code\\sandbox\\function-graph-overview\\media\\screenshots\\color-scheme\\custom.png",
  // ).bytes();
  const response = await agent.uploadBlob(imageData, { encoding: "image/png" });
  if (!response.success) {
    throw new Error("Failed to upload image");
  }

  const linkText = new UnicodeString(text);

  const richText = new RichText({ text });
  await richText.detectFacets(agent);

  const postResponse = await agent.post({
    text: richText.text,
    facets: [
      {
        index: { byteStart: 0, byteEnd: linkText.length },
        features: [
          {
            $type: "app.bsky.richtext.facet#link",
            uri: link,
          },
        ],
      },
    ],
    embed: {
      $type: "app.bsky.embed.images",
      images: [
        {
          alt,
          image: response.data.blob,
          // aspectRatio: { height: 2, width: 1 }
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

function makeLink(func: Func): string {
  const line = func.func.startPosition.row + 1;
  const link = `https://sourceware.org/git/?p=glibc.git;a=blob;f=${func.file.replace("\\", "/")};hb=0852c4aab7870adbd188f7d27985f1631c8596df#l${line}`;
  return link;
}

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
  return cfg.graph.order < 50;
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
  await $`uvx --isolated --from cairosvg cairosvg cfgbot.svg -o cfgbot.png --output-height 2000 -b ${colors["graph.background"]}`;
  return Bun.file("cfgbot.png").bytes();
}

async function preparePost(
  root: string,
): Promise<{ png: Uint8Array; text: string; alt: string; link: string }> {
  const func = await chooseFunction(root, isAlreadySeen, 100);
  if (!func) {
    throw new Error("No function found!");
  }

  const image = await renderFunction(func, chooseColorScheme());
  console.log(makeLink(func));
  const funcdef = getFuncdef(
    await Bun.file(path.join(root, func.file)).text(),
    func.func,
  );
  const text = `${func.file}:${func.func.startPosition.row + 1}:${funcdef}`;
  const link = makeLink(func);
  return {
    png: image,
    text,
    alt: `Graph of the ${funcdef} function from ${func.file}`,
    link,
  };
}

/*
Next steps:

1. Create script to export (filename, function start position, node count)
    of a full codebase into JSON
2. Write a script that takes a (filename, start position) and renders a function to SVG
3. Convert the rest of the bot to Python, so that image manipulation is easy.
4. Add link to the web-demo with the selected code & language & color-scheme
*/
