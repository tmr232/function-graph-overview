<script lang="ts">
  import { go } from "@codemirror/lang-go";
  import { cpp } from "@codemirror/lang-cpp";
  import { python } from "@codemirror/lang-python";
  import Graph from "./Graph.svelte";
  import type { Language } from "../control-flow/cfg";
  import * as LZString from "lz-string";
  import Editor from "./Editor.svelte";
  import CodeSegmentation from "./CodeSegmentation.svelte";
  import ColorScheme from "./ColorSchemeEditor.svelte";
  import { getSystemColorList, toggleTheme, isDark } from "./lightdark.ts";

  export let codeGo = "func Example() {\n\tif x {\n\t\treturn\n\t}\n}";
  export let codeC = "void main() {\n\tif (x) {\n\t\treturn;\n\t}\n}";
  export let codePython = "def example():\n    if x:\n        return";
  let offsetToHighlight: number | undefined = undefined;
  let colorList = getSystemColorList();
  let languages: {
    language: Language;
    text: string;
  }[] = [
    { language: "Go" as Language, text: "Go" },
    { language: "C" as Language, text: "C" },
    { language: "Python" as Language, text: "Python (experimental)" },
  ];

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("go")) {
    codeGo = LZString.decompressFromEncodedURIComponent(urlParams.get("go"));
  }
  if (urlParams.has("c")) {
    codeC = LZString.decompressFromEncodedURIComponent(urlParams.get("c"));
  }
  if (urlParams.has("python")) {
    codePython = LZString.decompressFromEncodedURIComponent(
      urlParams.get("python"),
    );
  }

  let simplify = true;
  let flatSwitch = false;
  let highlight = true;
  let colorPicker = false;
  let verbose = urlParams.has("verbose");
  let showSegmentation = urlParams.has("segmentation");
  let debugMode = urlParams.has("debug");

  let selection = languages[parseInt(urlParams.get("language")) || 0];
  let code = codeGo;
  $: {
    switch (selection.language) {
      case "C":
        code = codeC;
        break;
      case "Go":
        code = codeGo;
        break;
      case "Python":
        code = codePython;
        break;
    }
  }

  function share() {
    const compressedCode = LZString.compressToEncodedURIComponent(code);
    const codeName = selection.language.toLowerCase();
    const language = languages.findIndex((lang) => lang == selection);
    const query = `?language=${language}&${codeName}=${compressedCode}`;
    const newUrl =
      window.location.protocol +
      "//" +
      window.location.host +
      window.location.pathname +
      query;
    navigator.clipboard.writeText(newUrl);
    window.open(newUrl, "_blank").focus();
  }

  let graph: Graph;

  function downloadString(text: string, fileType: string, fileName: string) {
    var blob = new Blob([text], { type: fileType });

    var a = document.createElement("a");
    a.download = fileName;
    a.href = URL.createObjectURL(blob);
    a.dataset.downloadurl = [fileType, a.download, a.href].join(":");
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
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

  let editor: Editor;

  function onNodeClicked(
    e: CustomEvent<{ node: string; offset: number | null }>,
  ): void {
    console.log("Node clicked!", e.detail.node, e.detail.offset);
    const offset = e.detail.offset;
    if (offset !== null && offset !== undefined) editor?.setCursor(offset);
  }

  $: if (!colorPicker && graph) {
    graph.applyColors(colorList);
  }

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
    </div>
    <div class="themeToggleWrapper">
      <button
        class="themeToggle"
        on:click={onToggleClick}
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
          on:change={(e) => console.log(selection)}
        >
          {#each languages as language}
            <option value={language}>
              {language.text}
            </option>
          {/each}
        </select>
        <button on:click={share}>Share (experimental)</button>
      </div>
      <div class="codemirror">
        {#if selection.language === "Go"}
          <Editor
            bind:this={editor}
            bind:code={codeGo}
            lang={go()}
            on:cursorMoved={cursorMoved}
          />
        {:else if selection.language === "C"}
          <Editor
            bind:this={editor}
            bind:code={codeC}
            lang={cpp()}
            on:cursorMoved={cursorMoved}
          />
        {:else if selection.language === "Python"}
          <Editor
            bind:this={editor}
            bind:code={codePython}
            lang={python()}
            on:cursorMoved={cursorMoved}
          />
        {/if}
      </div>
      {#if showSegmentation}
        <div class="segmentation">
          <CodeSegmentation {code} language={selection.language} {simplify} />
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

        {#if debugMode}
          <input type="checkbox" id="verbose" bind:checked={verbose} />
          <label for="verbose">Verbose</label>

          <input
            type="checkbox"
            id="showSegmentation"
            bind:checked={showSegmentation}
          />
          <label for="showSegmentation">Show Segmnetation</label>

          <input type="checkbox" id="highlight" bind:checked={highlight} />
          <label for="highlight">Highlight</label>
        {/if}
      </div>
      <div class="download">
        <button on:click={saveSVG}>Save SVG</button>
        {#if debugMode}
          <button on:click={editDOT}>Edit DOT</button>
        {/if}
      </div>
    </div>
    <Graph
      {code}
      {offsetToHighlight}
      language={selection.language}
      {simplify}
      {flatSwitch}
      {verbose}
      {highlight}
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
