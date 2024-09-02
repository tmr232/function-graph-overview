<script lang="ts">
  import Graph from "./Graph.svelte";

  const goSamples = import.meta.glob("../assets/samples/*.go", {
    eager: true,
    as: "raw",
  });

  let simplify:boolean=true;
  let verbose:boolean=false;
  let trim:boolean=true;
</script>

<div class="controls">
  <input type="checkbox" id="simplify" bind:checked={simplify} />
  <label for="simplify">Simplify</label>

  <input type="checkbox" id="verbose"  bind:checked={verbose}/>
  <label for="verbose">Verbose</label>

  <input type="checkbox" id="trim"  bind:checked={trim}/>
  <label for="trim">Trim</label>
</div>
<div class="container">
  {#each Object.entries(goSamples) as [name, code] (name)}
    <div class="code"><pre>{code}</pre></div>
    <Graph {code} {simplify} {verbose} {trim} />
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
