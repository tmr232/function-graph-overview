<script lang="ts">
  import testReportsJson from "../../../../dist/tests/testReport.json?json";
  import type { TestReport } from "../../../test/reporting";
  import DotRender from "./DotRender.svelte";

  let showAll: boolean = false;
  const testReports = testReportsJson as TestReport[];

  const failCount = testReports.filter((report) => report.failed).length;
</script>

<div class="controls">
  <input type="checkbox" id="showAll" bind:checked={showAll} />
  <label for="showAll">Show All</label>
</div>
<div class="content">
  <div class="summary" class:green={failCount === 0} class:red={failCount}>
    {#if failCount === 0}
      All tests pass.
    {:else}
      {failCount} failing test{failCount > 1 ? "s" : ""}.
    {/if}
  </div>
  <div class="container">
    {#each testReports as { name, language, code, dot, failed, results } (name)}
      {#if failed || showAll}
        <div class="code-side" data-failed={failed}>
          <div class="test-name">{language}: {name}</div>
          <div class="code"><pre>{code}</pre></div>
          <div class="results">
            {#each results as { reqName, reqValue, failure } (reqName)}
              {#if failure !== null}
                <div class="result">
                  {reqName}: {reqValue}; {failure}
                </div>
              {/if}
            {/each}
          </div>
        </div>
        <div class="dot">
          {#if dot.current !== dot.snapshot}
            <DotRender dot={dot.snapshot} />
          {/if}
          <DotRender dot={dot.current} />
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .dot {
    display: flex;
    flex-direction: row;
  }
  .content {
    position: relative;
    top: 2em;
  }
  .container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1em;
  }
  .controls {
    position: fixed;
    top: 0;
    left: 0;
    box-shadow: 0px 0px 6px 0px rgba(0, 0, 0, 0.5);
    width: 100%;
    background-color: white;
    z-index: 10;
    height: 2em;
  }
  .summary {
    font-size: 2rem;
    text-align: center;
    margin-bottom: 1rem;
  }
  .green {
    background-color: greenyellow;
  }
  .red {
    background-color: salmon;
  }
  .code-side {
    padding-left: 1rem;
  }

  .code-side[data-failed="true"] {
    border-left: 10px salmon solid;
  }

  .code-side[data-failed="false"] {
    border-left: 10px greenyellow solid;
  }
</style>
