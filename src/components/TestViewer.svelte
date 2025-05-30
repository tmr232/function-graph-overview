<script lang="ts">
import testRecordsJson from "../../dist/tests/commentTests.json?json";
import type { TestFuncRecord } from "../test/commentTestUtils";
import TestGraph from "./TestGraph.svelte";
import {
  type TestResults,
  initialize as initializeUtils,
  runTest,
} from "./utils";

const testRecords = testRecordsJson as TestFuncRecord[];

async function runAllTests() {
  await initializeUtils();

  const testResults = testRecords.map((record) => {
    let results: TestResults[];
    try {
      results = runTest(record);
    } catch (error) {
      console.trace(
        `\nFailed running tests for ${record.language}: ${record.name}\n`,
        error,
      );
      results = [
        {
          reqName: "Tests",
          reqValue: "Failed to complete",
          failure: `${error}`,
        },
      ];
    }
    return {
      record,
      failed: !results.every((result) => result.failure === null),
      results,
    };
  });

  const failCount = testResults.filter(({ failed }) => failed).length;

  return { testResults, failCount };
}

let simplify: boolean = $state(true);
let verbose: boolean = $state(false);
let trim: boolean = $state(true);
let flatSwitch: boolean = $state(true);
let showAll: boolean = $state(false);
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
{#await runAllTests() then { failCount, testResults }}
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
            <div class="test-name">{record.language}: {record.name}</div>
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
{/await}

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
