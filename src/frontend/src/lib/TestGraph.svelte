<script lang="ts">
  import { processRecord, type RenderOptions } from "./utils";
  import { type TestFuncRecord } from "../../../test/commentTestUtils";

  let ast: string = "";
  let dot: string = "";
  let visibleTestResults: string = "";
  export let record: TestFuncRecord;
  export let verbose: boolean = false;
  export let simplify: boolean = true;
  export let trim: boolean = true;
  export let flatSwitch: boolean = false;

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
  ): string {
    const results = processRecord(record, options);
    dot = results.dot;
    ast = formatAST(results.ast);
    return results.svg;
  }

  function renderWrapper(record: TestFuncRecord, options: RenderOptions) {
    try {
      return renderRecord(record, options);
    } catch (error) {
      return `<p style='border: 2px red solid;'>${error.toString()}</p>`;
    }
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
    <summary>DOT</summary>
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
