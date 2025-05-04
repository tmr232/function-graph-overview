<script lang="ts">
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
import { MultiDirectedGraph } from "graphology";
import { onMount } from "svelte";
import { type Node as SyntaxNode } from "web-tree-sitter";
import { callProcessorFor } from "../../control-flow/call-processor";
import { type Language, newCFGBuilder } from "../../control-flow/cfg";
import {
  type CFG,
  type GraphEdge,
  type GraphNode,
  mergeNodeAttrs,
} from "../../control-flow/cfg-defs";
import {
  type ColorScheme,
  getDarkColorList,
  getLightColorList,
  listToScheme,
} from "../../control-flow/colors";
import { extractFunctionName } from "../../control-flow/function-utils";
import { simplifyCFG, trimFor } from "../../control-flow/graph-ops";
import { Lookup } from "../../control-flow/ranges";
import { graphToDot } from "../../control-flow/render";
import {
  getLanguage,
  initParsers,
  iterFunctions,
} from "../../file-parsing/vite";

// Add state for panel and checkbox controls
let isPanelOpen = false;
let showMetadata = {
  language: false,
  functionName: false,
  lineCount: false,
  nodeCount: false,
  edgeCount: false,
  cyclomaticComplexity: false,
};

// Metadata field definitions
const metadataFields = [
  {
    key: "language",
    label: "Language",
    value: () => functionAndCFGMetadata.functionData.language,
  },
  {
    key: "functionName",
    label: "Function Name",
    value: () => functionAndCFGMetadata.functionData.name,
  },
  {
    key: "lineCount",
    label: "Line Count",
    value: () => functionAndCFGMetadata.functionData.lineCount,
  },
  {
    key: "nodeCount",
    label: "Node Count",
    value: () => functionAndCFGMetadata.cfgGraphData.nodeCount,
  },
  {
    key: "edgeCount",
    label: "Edge Count",
    value: () => functionAndCFGMetadata.cfgGraphData.edgeCount,
  },
  {
    key: "cyclomaticComplexity",
    label: "Cyclomatic Complexity",
    value: () => functionAndCFGMetadata.cfgGraphData.cyclomaticComplexity,
  },
];

// Toggle panel open/closed
function togglePanel() {
  isPanelOpen = !isPanelOpen;
}

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
function buildCFG(func: SyntaxNode, language: Language): CFG {
  const builder = newCFGBuilder(language, {
    flatSwitch: true,
    callProcessor: callProcessorFor(language),
  });

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
    document.body.setAttribute("data-theme", "dark");
  } else {
    document.body.style.backgroundColor = "#ddd";
    document.body.setAttribute("data-theme", "light");
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
type FunctionAndCFGMetadata = {
  functionData: {
    name: string;
    lineCount: number;
    language: Language;
  };
  cfgGraphData: {
    nodeCount: number;
    edgeCount: number;
    cyclomaticComplexity: number;
  };
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

async function fetchFunctionAndLanguage(
  ghParams: GithubParams,
): Promise<{ func: SyntaxNode; language: Language }> {
  const { rawUrl, line } = ghParams;
  const response = await fetch(rawUrl);
  const code = await response.text();
  // We assume that the raw URL always ends with the file extension
  const language = getLanguage(rawUrl);
  const func = await getFunctionByLine(code, language, line);
  if (!func) {
    throw new Error(`Unable to find function on line ${line}`);
  }

  return { func, language };
}

async function createGitHubCFG(ghParams: GithubParams): Promise<CFG> {
  const { func, language } = await fetchFunctionAndLanguage(ghParams);
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
  return { graph, entry, offsetToNode: new Lookup("Not found") };
}

async function createCFG(params: Params): Promise<CFG> {
  switch (params.type) {
    case "GitHub":
      return createGitHubCFG(params);
    case "Graph":
      return createGraphCFG(params);
  }
}

let functionAndCFGMetadata: FunctionAndCFGMetadata | undefined;

function updateMetadata(func: SyntaxNode, language: Language, CFG: CFG) {
  // Update function metadata
  const name: string | undefined = extractFunctionName(func, language);
  const lineCount: number = func.endPosition.row - func.startPosition.row + 1;

  // Update CFG metadata
  const nodeCount: number = CFG.graph.order;
  const edgeCount: number = CFG.graph.size;
  const cyclomaticComplexity: number = CFG.graph.size - nodeCount + 2;

  return {
    functionData: {
      name,
      lineCount,
      language,
    },
    cfgGraphData: {
      nodeCount,
      edgeCount,
      cyclomaticComplexity,
    },
  };
}

async function render() {
  try {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = parseUrlSearchParams(urlSearchParams);
    setBackgroundColor(params.colors);

    const cfg = await createCFG(params);

    if (params.type === "GitHub") {
      codeUrl = params.codeUrl;
      const { func, language } = await fetchFunctionAndLanguage(params);
      functionAndCFGMetadata = updateMetadata(func, language, cfg);
    }

    const graphviz = await Graphviz.load();
    rawSVG = graphviz.dot(graphToDot(cfg, false, params.colorScheme));
    return rawSVG;
  } catch (error) {
    console.error(error);
    throw error;
  }
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
  setTimeout(() => {
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
    <button onclick={resetView}>Reset View</button>
    <button
      onclick={openCode}
      disabled={!Boolean(codeUrl)}
      title={Boolean(codeUrl) ? "" : "Only available for GitHub code"}
    >Open Code</button>
    <button onclick={saveSVG}>Download SVG</button>
  </div>
  {#if functionAndCFGMetadata}
   <!-- Metadata display -->
{#if Object.values(showMetadata).some(value => value)}
<div class="metadata" class:panel-open={isPanelOpen}>
  {#each metadataFields as { key, label, value }}
    {#if showMetadata[key]}
      <span>{label}: {value()}</span>
    {/if}
  {/each}
</div>
{/if}
    <button class="panel-toggle" onclick={togglePanel}>
      {isPanelOpen ? '→' : '←'}
    </button>
    <!-- Control panel -->
    <div class="control-panel" class:open={isPanelOpen}>
      <h3>Display Options</h3>
      {#each metadataFields as { key, label }}
        <label>
          <input type="checkbox" bind:checked={showMetadata[key]} />
          {label}
        </label>
      {/each}
    </div>
  {/if}
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
    justify-content: flex-end;
    width: 100%;
    top: 0;
    right: 0;
    z-index: 1002;
  }

  .controls {
    margin: 1em;
  }

  .metadata {
    position: fixed;
    top: 4em;
    right: 18.5em;
    padding: 1em;
    background-color: var(--metadata-bg);
    transition: right 0.2s ease;
  }

  .metadata:not(.panel-open) {
    right: 2.5em;
  }

  .metadata span {
    display: block;
    margin: 0.5em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-color);
    font-size: 1em;
  }

  .panel-toggle {
    position: fixed;
    top: 4em;
    z-index: 1001;
    width: 2em;
    height: 4em;
    background-color: var(--toggle-bg);
    color: var(--toggle-color);
    border: none;
    font-size: 1em;
  }

    .panel-toggle:hover {
        cursor: pointer;
    }

  .control-panel {
    position: fixed;
    top: 4em;
    right: -20em;
    width: 18em;
    padding: 1.25em;
    background-color: var(--panel-bg);
    color: var(--panel-text);
    box-sizing: border-box;
    font-size: 1em;
    transition: right 0.2s ease;
  }

  .control-panel.open {
    right: 0;
  }

  .control-panel h3 {
    margin: 0 0 1.25em;
    font-size: 1.5em;
    color: var(--panel-heading);
  }

  .control-panel label {
    display: flex;
    align-items: center;
    gap: 0.5em;
    margin-bottom: 1em;
    cursor: pointer;
  }

  .svgContainer {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }

  :global(body), :global(body[data-theme="dark"]) {
    --text-color: white;
    --panel-bg: rgba(30, 30, 30, 0.7);
    --panel-text: white;
    --panel-heading: white;
    --toggle-bg: #555;
    --toggle-color: white;
    --metadata-bg: rgba(30, 30, 30, 0.7);
  }

  :global(body[data-theme="light"]) {
    --text-color: black;
    --panel-bg: rgba(240, 240, 240, 0.9);
    --panel-text: black;
    --panel-heading: black;
    --toggle-bg: #aaa;
    --toggle-color: black;
    --metadata-bg: rgba(240, 240, 240, 0.9);
  }
</style>
