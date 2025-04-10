<script lang="ts">
import { run } from "svelte/legacy";

import { cpp } from "@codemirror/lang-cpp";
import { go } from "@codemirror/lang-go";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import type { LanguageSupport } from "@codemirror/language";
import * as LZString from "lz-string";
import { onMount } from "svelte";
import type { Language } from "../control-flow/cfg";
import { evolve } from "../control-flow/evolve.ts";
import CodeSegmentation from "./CodeSegmentation.svelte";
import ColorScheme from "./ColorSchemeEditor.svelte";
import Editor from "./Editor.svelte";
import Graph from "./Graph.svelte";
import { getSystemColorList, isDark, toggleTheme } from "./lightdark.ts";

// ADD-LANGUAGES-HERE
const defaultCodeSamples: { [language in Language]?: string } = {
  Go: "func Example() {\n\tif x {\n\t\treturn\n\t}\n}",
  C: "void main() {\n\tif (x) {\n\t\treturn;\n\t}\n}",
  "C++": "void main() {\n\tif (x) {\n\t\treturn;\n\t}\n}",
  Python: "def example():\n    if x:\n        return",
  TypeScript: "function main() {\n\tif (x) {\n\t\treturn;\n\t}\n}",
  TSX:
    "function getGreeting(user) {\n" +
    "  if (user) {\n" +
    "    return <h1>Hello, {formatName(user)}!</h1>;  }\n" +
    "  return <h1>Hello, Stranger.</h1>;}",
};

interface Props {
  code?: { [language in Language]?: string };
}

let { code = {} }: Props = $props();

const languageCode = $state(evolve(defaultCodeSamples, code));

let offsetToHighlight: number | undefined = $state(undefined);
let colorList = $state(getSystemColorList());
// ADD-LANGUAGES-HERE
let languages: {
  language: Language;
  text: string;
  codeMirror: () => LanguageSupport;
}[] = [
  { language: "Go" as Language, text: "Go", codeMirror: go },
  { language: "C" as Language, text: "C", codeMirror: cpp },
  {
    language: "Python" as Language,
    text: "Python",
    codeMirror: python,
  },
  {
    language: "C++" as Language,
    text: "C++",
    codeMirror: cpp,
  },
  {
    language: "TypeScript" as Language,
    text: "TypeScript (experimental)",
    codeMirror: () => javascript({ typescript: true }),
  },
  {
    language: "TSX" as Language,
    text: "TSX (experimental)",
    codeMirror: () => javascript({ typescript: true, jsx: true }),
  },
] as const;

let currentVersion: number = 1; // Needs to be updated when a new version is released.
let fontSize = $state("1em");
let simplify = $state(true);
let flatSwitch = $state(true);
let highlight = $state(true);
let parsedColorList = undefined;
const urlParams = new URLSearchParams(window.location.search);
let selection = $state(
  languages.find(
    (lang) =>
      lang.language.toLowerCase() === urlParams.get("language")?.toLowerCase(),
  ) ?? languages[0],
);
/**
 * Parses URL parameters according to version 1 format.
 *
 * This version expects a single `data` parameter containing a compressed JSON
 * with all necessary configuration, including:
 *
 * - version
 * - language
 * - code
 * - fontSize
 * - simplify
 * - flatSwitch
 * - highlight
 * - colors
 *
 * This format makes the URL more compact and easier to extend in the future.
 *
 * Notes:
 * - If `data` is present, it overrides all other URL parameters.
 * - If `language` is provided without `data`, the default code sample for that
 *   language is used.
 */

if (urlParams.has("data")) {
  const parsedData = JSON.parse(
    LZString.decompressFromEncodedURIComponent(urlParams.get("data")),
  );
  if (parsedData.version === 1) {
    fontSize = parsedData.fontSize;
    simplify = parsedData.simplify;
    flatSwitch = parsedData.flatSwitch;
    highlight = parsedData.highlight;
    parsedColorList = parsedData.colors;
    selection = languages.find(
      (lang) => lang.language.toLowerCase() === parsedData.language,
    );
    if (parsedData.language === "go") {
      languageCode.Go = parsedData.code;
    } else if (parsedData.language === "c") {
      languageCode.C = parsedData.code;
    } else if (parsedData.language === "c++") {
      languageCode["C++"] = parsedData.code;
    } else if (parsedData.language === "python") {
      languageCode.Python = parsedData.code;
    } else if (parsedData.language === "typescript") {
      languageCode.TypeScript = parsedData.code;
    } else if (parsedData.language === "tsx") {
      languageCode.TSX = parsedData.code;
    }
  }
}
onMount(() => {
  if (parsedColorList) {
    colorList = colorListParam;
  }
});

let colorPicker = $state(false);
let verbose = $state(urlParams.has("verbose"));
let showSegmentation = $state(urlParams.has("segmentation"));
let showRegions = $state(urlParams.has("showRegions"));
let debugMode = urlParams.has("debug");
const range = (start: number, end: number) =>
  Array.from({ length: end - start }, (_v, k) => k + start);
const fontSizes: { label: string; value: string }[] = [
  { label: "Default", value: "1em" },
  ...range(8, 31).map((n) => ({ label: `${n}`, value: `${n}px` })),
];

function share() {
  const code = languageCode[selection.language];
  const codeName = selection.language.toLowerCase();
  const colorConfig = colorList;
  const parameters = {
    version: currentVersion,
    language: codeName,
    code,
    fontSize,
    simplify,
    flatSwitch,
    highlight,
    colors: colorConfig,
  };
  const compressed = LZString.compressToEncodedURIComponent(
    JSON.stringify(parameters),
  );
  const query = `?data=${compressed}`;
  const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}${query}`;
  navigator.clipboard.writeText(newUrl);
  window.open(newUrl, "_blank").focus();
}

let graph: Graph = $state();

function downloadString(text: string, fileType: string, fileName: string) {
  const blob = new Blob([text], { type: fileType });

  const a = document.createElement("a");
  a.download = fileName;
  a.href = URL.createObjectURL(blob);
  a.dataset.downloadurl = [fileType, a.download, a.href].join(":");
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
  }, 1500);
}

function saveSVG() {
  const svg = graph.getSVG();
  downloadString(svg, "image/svg+xml", "function-graph-overview.svg");
}

function editDotLink(dot: string): string {
  return `https://dreampuf.github.io/GraphvizOnline/?compressed=${LZString.compressToEncodedURIComponent(dot)}`;
}

function editDOT() {
  const dot = graph.getDOT();
  const url = editDotLink(dot);
  window.open(url, "_blank", "noopener");
}

function cursorMoved(event): void {
  const { index } = event.detail.pos;
  offsetToHighlight = index;
}

let editor: Editor = $state();

function onNodeClicked(
  e: CustomEvent<{ node: string; offset: number | null }>,
): void {
  console.log("Node clicked!", e.detail.node, e.detail.offset);
  const offset = e.detail.offset;
  if (offset !== null && offset !== undefined) editor?.setCursor(offset);
}

run(() => {
  if (!colorPicker && graph) {
    graph.applyColors(colorList);
  }
});

function onColorPreview(e) {
  colorList = e.detail.colors;
  graph.previewColors(colorList);
}

function onToggleClick(e) {
  toggleTheme();
}

isDark.subscribe(() => {
  colorList = getSystemColorList();
});
</script>

<main>
  <header>
    <h1>Function Graph Overview</h1>
    <div class="links">
      <a href="https://github.com/tmr232/function-graph-overview/">Repo</a>
      <a
        href="https://marketplace.visualstudio.com/items?itemName=tamir-bahar.function-graph-overview"
        >VSCode Extension</a
      >
      <a
        href="https://plugins.jetbrains.com/plugin/25676-function-graph-overview"
        >JetBrains Plugin</a
      >
    </div>
    <div class="themeToggleWrapper">
      <button
        class="themeToggle"
        onclick={onToggleClick}
        title="Switch between the light and dark themes."
      ></button>
    </div>
  </header>
  <div class="editor">
    {#if colorPicker}
      <div class="picker">
        <ColorScheme on:preview={onColorPreview} {colorList} />
      </div>
    {:else}
      <div class="controls">
        <select
          bind:value={selection}
          onchange={(e) => console.log(selection)}
        >
          {#each languages as language}
            <option value={language}>
              {language.text}
            </option>
          {/each}
        </select>
        <select bind:value={fontSize}>
          {#each fontSizes as { label, value }}
            <option {value}>
              {label}
            </option>
          {/each}
        </select>
        <button onclick={share}>Share</button>
      </div>
      <div class="codemirror">
        <Editor
          bind:this={editor}
          bind:code={languageCode[selection.language]}
          lang={selection.codeMirror()}
          on:cursorMoved={cursorMoved}
          {fontSize}
        />
      </div>
      {#if showSegmentation}
        <div class="segmentation">
          <CodeSegmentation
            code={languageCode[selection.language]}
            language={selection.language}
            {simplify}
          />
        </div>
      {/if}
    {/if}
  </div>

  <div class="graph">
    <div class="graph-controls">
      <div class="settings">
        <input type="checkbox" id="simplify" bind:checked={simplify} />
        <label for="simplify">Simplify</label>

        <input type="checkbox" id="flatSwitch" bind:checked={flatSwitch} />
        <label for="flatSwitch">Flat Switch</label>

        <input type="checkbox" id="colorPicker" bind:checked={colorPicker} />
        <label for="colorPicker">Color Picker</label>

        <input type="checkbox" id="highlight" bind:checked={highlight} />
        <label for="highlight">Highlight</label>

        {#if debugMode}
          <input type="checkbox" id="verbose" bind:checked={verbose} />
          <label for="verbose">Verbose</label>

          <input
            type="checkbox"
            id="showSegmentation"
            bind:checked={showSegmentation}
          />
          <label for="showSegmentation">Show Segmnetation</label>

          <input type="checkbox" id="showRegions" bind:checked={showRegions} />
          <label for="showRegions">Show Regions</label>
        {/if}
      </div>
      <div class="download">
        <button onclick={saveSVG}>Save SVG</button>
        {#if debugMode}
          <button onclick={editDOT}>Edit DOT</button>
        {/if}
      </div>
    </div>
    <Graph
      code={languageCode[selection.language]}
      {offsetToHighlight}
      language={selection.language}
      {simplify}
      {flatSwitch}
      {verbose}
      {highlight}
      {showRegions}
      bind:this={graph}
      on:node-clicked={onNodeClicked}
    />
  </div>
</main>

<style>
  main {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    /* width: 90%; */
    padding: 2em;
    grid-template-areas:
      "header header"
      "editor graph";
  }
  header {
    grid-area: header;
    font-family: Arial, Helvetica, sans-serif;
    text-align: center;
    filter: drop-shadow(0 0 0.3rem var(--panel-shadow-color));
    background-color: var(--panel-background-color);
    position: relative;
  }
  .controls {
    font-family: Arial, Helvetica, sans-serif;
    margin-top: 1rem;
    margin-left: 1rem;
  }
  .graph-controls {
    font-family: Arial, Helvetica, sans-serif;
    margin-top: 1rem;
    margin-left: 1rem;
    margin-right: 1rem;

    display: flex;
    justify-content: space-between;
  }

  .codemirror {
    padding-top: 1rem;
  }
  .graph,
  .segmentation,
  .editor {
    background-color: var(--panel-background-color);
    filter: drop-shadow(0 0 0.3rem var(--panel-shadow-color));
  }

  .links a {
    color: var(--text-color);
    padding: 0.5rem;
  }

  .links a:hover {
    background-color: var(--link-hover-background);
    padding: 0.5rem;
  }
  .links {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    position: absolute;
    right: 3rem;
    top: 0;
    height: 100%;
  }
  .themeToggleWrapper {
    display: flex;
    justify-content: center;
    align-items: center;

    position: absolute;
    top: 0;
    left: 3rem;
    height: 100%;
    line-height: 3rem;
  }
  .themeToggle::before {
    font-size: 2rem;
    content: var(--theme-toggle-emoji);
  }
  .themeToggle {
    background: none;
    border: none;
  }
  .themeToggle:hover {
    filter: drop-shadow(0 0 0.5rem var(--theme-toggle-shadow-color));
    cursor: pointer;
  }
  .picker {
    /* position: fixed;
    z-index: 100;
    top: 0;
    left: 0;
    background-color: white; */
    font-family: Arial, Helvetica, sans-serif;
  }
</style>
