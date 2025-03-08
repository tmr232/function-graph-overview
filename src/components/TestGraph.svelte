<script lang="ts">
  import * as LZString from "lz-string";
  import { type TestFuncRecord } from "../test/commentTestUtils";
  import type { RenderOptions } from "./renderer.ts";
  import { processRecord } from "./utils";

  let ast: string = "";
  let dot: string = "";
  let visibleTestResults: string = "";
  export let record: TestFuncRecord;
  export let verbose: boolean = false;
  export let simplify: boolean = true;
  export let trim: boolean = true;
  export let flatSwitch: boolean = true;

  function formatAST(ast: string): string {
    return ast
      .replaceAll(
        "(",
        "<div style='margin-left:10px;border-left: 1px #888 solid;'>",
      )
      .replaceAll(")", "</div>");
  }

  function renderRecord(
    record: TestFuncRecord,
    options: RenderOptions,
  ): { svg: string; error: Error | undefined } {
    const results = processRecord(record, options);
    dot = results.dot ?? "";
    ast = formatAST(results.ast);
    return { svg: results.svg ?? "", error: results.error };
  }

  function renderWrapper(record: TestFuncRecord, options: RenderOptions) {
    try {
      const { svg, error } = renderRecord(record, options);
      if (error) throw error;
      return svg;
    } catch (error) {
      console.trace(error);
      return `<p style='border: 2px red solid;'>${error}</p>`;
    }
  }

  function editDotLink(dot: string): string {
    return `https://dreampuf.github.io/GraphvizOnline/?compressed=${LZString.compressToEncodedURIComponent(dot)}`;
  }
</script>

<div class="results">
  <div class="graph">
    {@html renderWrapper(record, { simplify, verbose, trim, flatSwitch })}
  </div>
  <p>
    {visibleTestResults}
  </p>
  <br />
  <details>
    <summary>AST</summary>
    {@html ast}
  </details>
  <br />
  <details>
    <summary>DOT <a href={editDotLink(dot)} target="_blank">Edit</a></summary>
    <pre>{dot}</pre>
  </details>
</div>

<style>
  .graph {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1em;
  }
</style>
