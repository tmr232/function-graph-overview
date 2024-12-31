<script lang="ts">
  import { getLanguage, iterFunctions } from "../../file-parsing/vite";
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
  import { tick } from "svelte";

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
  function getFunctionByLine(
    code: string,
    language: Language,
    line: number,
  ): SyntaxNode | undefined {
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

    const func = getFunctionByLine(code, language, line);
    if (!func) {
      throw new Error(`Unable to find function on line ${line}`);
    }

    const cfg = buildCFG(func, language);
    const graphviz = await Graphviz.load();
    rawSVG = graphviz.dot(graphToDot(cfg, false, undefined, colorScheme));
    return rawSVG;
  }


  function getSVGSize(svg:string):{width: string, height:string} {
    const {width, height} = /<svg width="(?<width>\w+pt)" height="(?<height>\w+pt)"/gm.exec(svg).groups;
    return {width, height};
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

  function saveSVG() {
    if (!rawSVG) {
      return;
    }
    downloadString(rawSVG, "image/svg+xml", "function-graph-overview.svg");
  }

  function calculateScale(size:{width:string, height:string}, tick:number) {
    /*
     tick == 0 => fit => calc(100dvh + 0 * height)
     tick == 10 => 1:1 => calc(0 * 100dvh + height)
     */
    const sizeRatio = tick / tickMax;
    const screenUnits = 100 * (1-sizeRatio);
    const width = `calc(${sizeRatio} * ${size.width} + ${screenUnits}dvw)`;
    const height = `calc(${sizeRatio} * ${size.height} + ${screenUnits}dvh)`;
    return {width, height}
  }

  function scaleToFit() {
    const {width, height} = calculateScale(getSVGSize(rawSVG), 0);
    document.querySelector("svg").style.width = width;
    document.querySelector("svg").style.height = height;
  }

  function setScale(tick:number) {
    if (!rawSVG) return;
    const {width, height} = calculateScale(getSVGSize(rawSVG), tick);
    document.querySelector("svg").style.width = width;
    document.querySelector("svg").style.height = height;
  }

  function onScaleChange(event) {
    setScale(event.target.value);
  }

  /* TODO:
      - Add controls
        - Zoom buttons
          - Zoom in
          - Zoom out
          - 1:1
          - Fit to screen
      - Show more detailed progress to the user

   */

  const tickMax = 10;
  let scaleTick = 0;

  $: setScale(scaleTick)
</script>

<div class="controlsContainer">
  <div class="controls">
    <input type="range" min="0" max={tickMax} step="1" on:change={onScaleChange} bind:value={scaleTick}/>
    <button on:click={scaleToFit}>Fit</button>
    <button on:click={saveSVG}>Download SVG</button>
  </div>
</div>
<div class="svgContainer">
  {#await render()}
    Loading code...
  {:then svg}
    {@html svg}
    <!--  {:catch error}-->
    <!--<p style="color: red">{error.message}</p>-->
  {/await}
</div>

<style>
  .controlsContainer {
    position: fixed;
    display: flex;
    justify-content: right;
    width: 100%;
  }
  .controls {
    margin: 1em;
  }
  .svgContainer {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
</style>
