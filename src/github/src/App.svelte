<script lang="ts">
  // https://github.com/python/cpython/blob/2bd5a7ab0f4a1f65ab8043001bd6e8416c5079bd/Lib/test/pythoninfo.py#L877
  // https://raw.githubusercontent.com/python/cpython/2bd5a7ab0f4a1f65ab8043001bd6e8416c5079bd/Lib/test/pythoninfo.py

  import { getLanguage, iterFunctions } from "../../file-parsing/vite";
  import type Parser from "web-tree-sitter";
  import {type SyntaxNode } from "web-tree-sitter";
  import { type Language, newCFGBuilder } from "../../control-flow/cfg";
  import { type CFG, mergeNodeAttrs } from "../../control-flow/cfg-defs";
  import { simplifyCFG, trimFor } from "../../control-flow/graph-ops";
  import { Graphviz } from "@hpcc-js/wasm-graphviz";
  import { graphToDot } from "../../control-flow/render";
  import { getDarkColorList, getLightColorList, listToScheme } from "../../control-flow/colors";

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
    line:number;
  };

  /**
   * Get the line number raw file URL from a GitHub URL
   * @param githubURL URL pointing to a specific file and line
   */
  function parseGithubUrl(githubURL:string):GithubCodeRef {
    const url = new URL(githubURL);
    // Remove the `#L` that precede the number
    const line  = Number.parseInt(url.hash.slice(2));
    if (Number.isNaN(line)) {
      throw new Error("Missing line number.");
    }

    const rawURL = githubURL.replace(/(?<host>https:\/\/github.com\/)(?<project>\w+\/\w+\/)(blob\/)(?<path>.*)(#L\d+)/, "https://raw.githubusercontent.com/$<project>$<path>");

    return {line, rawURL};
  }

  function buildCFG(func: Parser.SyntaxNode, language: Language): CFG {
    const builder = newCFGBuilder(language, { flatSwitch: true });

    let cfg = builder.buildCFG(func);

    cfg = trimFor(cfg);
    cfg = simplifyCFG(cfg, mergeNodeAttrs);
    return cfg;
  }

  function getFunctionByLine(code:string, language:Language, line:number):SyntaxNode|undefined {
    for (const func of iterFunctions(code, language)) {
      // GitHub lines are 1-based, TreeSitter rows are 0-based
      if (func.startPosition.row + 1 === line) {
        return func
      }
    }
    return undefined;
  }

  async function render() {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const githubUrl = urlSearchParams.get("github")??"";
    const colors = urlSearchParams.get("colors")??"dark";
    if (colors !== "light" && colors !== "dark") {
      throw new Error(`Unsupported color scheme ${colors}`);
    }
    const {line, rawURL} = parseGithubUrl(githubUrl);
    const response = await fetch(rawURL);
    const code = await response.text();
    // We assume that the raw URL always ends with the file extension
    const language = getLanguage(rawURL)

    const func = getFunctionByLine(code, language, line);
    if (!func) {
      throw new Error(`Unable to find function on line ${line}`);
    }

    const cfg = buildCFG(func, language);
    const colorScheme = listToScheme(colors==="light"?getLightColorList():getDarkColorList());
    const graphviz = await Graphviz.load();
    return graphviz.dot(graphToDot(cfg, false, undefined, colorScheme));
  }

  /*
  1. URL should contain:
      - GitHub URL (if not raw - convert!)
      - Line number
      - Optional - column number (usually not needed, but should be used by the bot just in case)
      - Optional - color scheme (start with dark/light, add custom later)
  2. Fetch code from URL, parse and get the relevant function
  3. Render the SVG to screen
  4. Add a "download SVG" button
   */
</script>

<pre>
  {#await render()}
    Loading code...
    {:then svg}
    {@html svg}
  <!--  {:catch error}-->
	<!--<p style="color: red">{error.message}</p>-->
{/await}
</pre>