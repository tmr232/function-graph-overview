<script lang="ts">
  import {
    getLanguage,
    initParsers,
    iterFunctions,
  } from "../../file-parsing/vite";
  import type Parser from "web-tree-sitter";
  import { type SyntaxNode } from "web-tree-sitter";
  import { type Language, newCFGBuilder } from "../../control-flow/cfg";
  import { type CFG, mergeNodeAttrs } from "../../control-flow/cfg-defs";
  import { simplifyCFG, trimFor } from "../../control-flow/graph-ops";
  import { Graphviz } from "@hpcc-js/wasm-graphviz";
  import { graphToDot } from "../../control-flow/render";
  import {
    getDarkColorList,
    getLightColorList,
    listToScheme,
  } from "../../control-flow/colors";
  import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
  import { onMount } from "svelte";

  /**
   * A reference to a function on GitHub
   */
  type GithubCodeRef = {
    /**
     * The URL for the raw file on GitHub
     */
    rawURL: string;
    /**
     * The line-number for the function
     */
    line: number;
  };

  /**
   * Get the line number raw file URL from a GitHub URL
   * @param githubURL URL pointing to a specific file and line
   */
  function parseGithubUrl(githubURL: string): GithubCodeRef {
    const url = new URL(githubURL);
    // Remove the `#L` that precede the number
    const line = Number.parseInt(url.hash.slice(2));
    if (Number.isNaN(line)) {
      throw new Error("Missing line number.");
    }

    const rawURL = githubURL.replace(
      /(?<host>https:\/\/github.com\/)(?<project>\w+\/\w+\/)(blob\/)(?<path>.*)(#L\d+)/,
      "https://raw.githubusercontent.com/$<project>$<path>",
    );

    return { line, rawURL };
  }

  /**
   * Build the CFG with the same configuration as the CFGBot
   * @param func The function to generate a CFG for
   * @param language The code language
   */
  function buildCFG(func: Parser.SyntaxNode, language: Language): CFG {
    const builder = newCFGBuilder(language, { flatSwitch: true });

    let cfg = builder.buildCFG(func);

    cfg = trimFor(cfg);
    cfg = simplifyCFG(cfg, mergeNodeAttrs);
    return cfg;
  }

  /**
   * Find the function that starts at a given line in the code.
   * Assumes there is only one.
   * @param code The source code to search in
   * @param language Source code language
   * @param line Line number, 1-based.
   */
  async function getFunctionByLine(
    code: string,
    language: Language,
    line: number,
  ): Promise<SyntaxNode | undefined> {
    await initParsers();
    for (const func of iterFunctions(code, language)) {
      // GitHub lines are 1-based, TreeSitter rows are 0-based
      if (func.startPosition.row + 1 === line) {
        return func;
      }
    }
    return undefined;
  }

  function setBackgroundColor(colors: "light" | "dark") {
    if (colors === "dark") {
      document.body.style.backgroundColor = "black";
    } else {
      document.body.style.backgroundColor = "#ddd";
    }
  }

  function getColorScheme(colors: string) {
    return listToScheme(
      colors === "light" ? getLightColorList() : getDarkColorList(),
    );
  }

  let rawSVG: string | undefined;

  async function render() {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const githubUrl = urlSearchParams.get("github") ?? "";
    const colors = urlSearchParams.get("colors") ?? "dark";
    if (colors !== "light" && colors !== "dark") {
      throw new Error(`Unsupported color scheme ${colors}`);
    }
    const colorScheme = getColorScheme(colors);
    setBackgroundColor(colors);

    const { line, rawURL } = parseGithubUrl(githubUrl);
    const response = await fetch(rawURL);
    const code = await response.text();
    // We assume that the raw URL always ends with the file extension
    const language = getLanguage(rawURL);

    const func = await getFunctionByLine(code, language, line);
    if (!func) {
      throw new Error(`Unable to find function on line ${line}`);
    }

    const cfg = buildCFG(func, language);
    const graphviz = await Graphviz.load();
    rawSVG = graphviz.dot(graphToDot(cfg, false, undefined, colorScheme));
    return rawSVG;
  }

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
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 1500);
  }

  function openCode() {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const githubUrl = urlSearchParams.get("github") ?? "";

    if (!githubUrl) return;

    window.open(githubUrl, "_blank").focus();
  }

  function saveSVG() {
    if (!rawSVG) {
      return;
    }
    downloadString(rawSVG, "image/svg+xml", "function-graph-overview.svg");
  }

  let panzoom: PanzoomObject | undefined;

  function resetView() {
    panzoom?.reset();
  }

  function makeZoomable() {
    const elem = document.querySelector(".svgContainer");
    panzoom = Panzoom(elem, { maxScale: 100, minScale: 1 });
    elem.parentElement.addEventListener("wheel", panzoom.zoomWithWheel);
  }

  /* TODO:
      - Show more detailed progress to the user

   */

  onMount(() => {
    makeZoomable();
  });
</script>

<div class="controlsContainer">
  <div class="controls">
    <button on:click={resetView}>Reset View</button>
    <button on:click={openCode}>Open Code</button>
    <button on:click={saveSVG}>Download SVG</button>
  </div>
</div>
<div class="svgContainer">
  {#await render()}
    <p style="color: green">Loading code...</p>
  {:then svg}
    {@html svg}
  {:catch error}
    <p style="color: red">{error.message}</p>
  {/await}
</div>

<style>
  .controlsContainer {
    position: fixed;
    display: flex;
    justify-content: right;
    width: 100%;
    z-index: 1000;
  }
  .controls {
    margin: 1em;
  }
  .svgContainer {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100dvw;
    height: 100dvh;
  }
</style>
