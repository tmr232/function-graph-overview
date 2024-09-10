<script lang="ts">
  import testRecordsJson from "../../../../dist/tests/commentTests.json?json";
  import type { TestFuncRecord } from "../../../test/commentTestUtils";
  import TestGraph from "./TestGraph.svelte";
  const testRecords = testRecordsJson as TestFuncRecord[];

  let simplify: boolean = true;
  let verbose: boolean = false;
  let trim: boolean = true;
  let flatSwitch: boolean = false;
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
</div>
<div class="container">
  {#each testRecords as record (record)}
    <div class="code"><pre>{record.code}</pre></div>
    <TestGraph
      {record}
      {simplify}
      {verbose}
      {trim}
      {flatSwitch}
      showAST={true}
      showDot={true}
    />
  {/each}
</div>

<style>
  .container {
    position: relative;
    top: 2em;
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
</style>
