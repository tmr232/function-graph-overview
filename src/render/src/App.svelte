<script lang="ts">
  import {
    getLanguage,
    initParsers,
    iterFunctions,
  } from "../../file-parsing/vite";
  import type Parser from "web-tree-sitter";
  import { type SyntaxNode } from "web-tree-sitter";
  import { type Language, newCFGBuilder } from "../../control-flow/cfg";
  import {
    type CFG,
    type GraphEdge,
    type GraphNode,
    mergeNodeAttrs,
  } from "../../control-flow/cfg-defs";
  import { simplifyCFG, trimFor } from "../../control-flow/graph-ops";
  import { Graphviz } from "@hpcc-js/wasm-graphviz";
  import { graphToDot } from "../../control-flow/render";
  import {
    type ColorScheme,
    getDarkColorList,
    getLightColorList,
    listToScheme,
  } from "../../control-flow/colors";
  import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
  import { onMount } from "svelte";
  import { MultiDirectedGraph } from "graphology";

  let codeUrl: string | undefined;

  /**
   * A reference to a function on GitHub
   */
  type GithubCodeRef = {
    /**
     * The URL for the raw file on GitHub
     */
    rawUrl: string;
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

    const rawUrl = githubURL.replace(
      /(?<host>https:\/\/github.com\/)(?<project>[^/]+\/[^/]+\/)(blob\/)(?<path>.*)(#L\d+)/,
      "https://raw.githubusercontent.com/$<project>$<path>",
    );

    return { line, rawUrl };
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

  type GithubParams = {
    type: "GitHub";
    rawUrl: string;
    codeUrl: string;
    line: number;
  };
  type GraphParams = {
    type: "Graph";
    rawUrl: string;
  };
  type Params = (GithubParams | GraphParams) & {
    colorScheme: ColorScheme;
    colors: "light" | "dark";
  };

  function parseUrlSearchParams(urlSearchParams: URLSearchParams): Params {
    const githubUrl = urlSearchParams.get("github");
    const colors = urlSearchParams.get("colors") ?? "dark";
    const graphUrl = urlSearchParams.get("graph");

    if (colors !== "dark" && colors !== "light") {
      throw new Error("Invalid color scheme");
    }
    if (!(githubUrl || graphUrl)) {
      throw new Error("No URL provided");
    }
    if (githubUrl && graphUrl) {
      throw new Error("Too many URLs provided");
    }

    const colorScheme = getColorScheme(colors);

    if (githubUrl) {
      const { line, rawUrl } = parseGithubUrl(githubUrl);
      return {
        type: "GitHub",
        rawUrl,
        line,
        colorScheme,
        colors,
        codeUrl: githubUrl,
      };
    }
    return {
      type: "Graph",
      rawUrl: graphUrl,
      colorScheme: colorScheme,
      colors,
    };
  }

  async function createGitHubCFG(ghParams: GithubParams): Promise<CFG> {
    const { rawUrl, line } = ghParams;
    const response = await fetch(rawUrl);
    const code = await response.text();
    // We assume that the raw URL always ends with the file extension
    const language = getLanguage(rawUrl);

    const func = await getFunctionByLine(code, language, line);
    if (!func) {
      throw new Error(`Unable to find function on line ${line}`);
    }

    return buildCFG(func, language);
  }

  async function createGraphCFG(graphParams: GraphParams): Promise<CFG> {
    const { rawUrl } = graphParams;
    const response = await fetch(rawUrl);
    const jsonData = await response.json();
    const graph = new MultiDirectedGraph<GraphNode, GraphEdge>();
    graph.import(jsonData);

    const entry = graph.findNode(
      (node, _attributes) => graph.inDegree(node) === 0,
    );
    if (!entry) {
      throw new Error("No entry found");
    }
    return { graph, entry, offsetToNode: [] };
  }

  async function createCFG(params: Params): Promise<CFG> {
    switch (params.type) {
      case "GitHub":
        return createGitHubCFG(params);
      case "Graph":
        return createGraphCFG(params);
    }
  }

  async function render() {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = parseUrlSearchParams(urlSearchParams);
    setBackgroundColor(params.colors);
    if (params.type === "GitHub") {
      codeUrl = params.codeUrl;
    }

    const cfg = await createCFG(params);
    const graphviz = await Graphviz.load();
    rawSVG = graphviz.dot(
      graphToDot(cfg, false, undefined, params.colorScheme),
    );
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
    window.open(codeUrl, "_blank").focus();
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
    <button
      on:click={openCode}
      disabled={!Boolean(codeUrl)}
      title={Boolean(codeUrl) ? "" : "Only available for GitHub code"}
      >Open Code</button
    >
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
