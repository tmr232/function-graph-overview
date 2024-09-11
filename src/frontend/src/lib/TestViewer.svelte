<script lang="ts">
  import testRecordsJson from "../../../../dist/tests/commentTests.json?json";
  import type { TestFuncRecord } from "../../../test/commentTestUtils";
  import TestGraph from "./TestGraph.svelte";
  import { runTest } from "./utils";
  const testRecords = testRecordsJson as TestFuncRecord[];

  const testResults = testRecords.map((record) => {
    const results = runTest(record);
    return {
      record,
      failed: !results.every((result) => result.failure === null),
      results,
    };
  });

  const failCount = testResults.filter(({ failed }) => failed).length;

  let simplify: boolean = true;
  let verbose: boolean = false;
  let trim: boolean = true;
  let flatSwitch: boolean = false;
  let showAll: boolean = false;
</script>

<div class="controls">
  <input type="checkbox" id="simplify" bind:checked={simplify} />
  <label for="simplify">Simplify</label>

  <input type="checkbox" id="verbose" bind:checked={verbose} />
  <label for="verbose">Verbose</label>

  <input type="checkbox" id="trim" bind:checked={trim} />
  <label for="trim">Trim</label>

  <input type="checkbox" id="flatSwitch" bind:checked={flatSwitch} />
  <label for="flatSwitch">Flat Switch</label>

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
    {#each testResults as { record, failed, results } (record)}
      {#if failed || showAll}
        <div class="code-side" data-failed={failed}>
          <div class="code"><pre>{record.code}</pre></div>
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
        <TestGraph {record} {simplify} {verbose} {trim} {flatSwitch} />
      {/if}
    {/each}
  </div>
</div>

<style>
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
