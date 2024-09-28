<script lang="ts">
  import { Graphviz } from "@hpcc-js/wasm-graphviz";
  import { initialize as initializeUtils } from "./utils";

  let graphviz: Graphviz;
  export let dot: string;

  async function initialize() {
    const utils = await initializeUtils();
    graphviz = utils.graphviz;
  }
</script>

<div class="graph">
  {#await initialize() then}
    {@html graphviz.dot(dot)}
  {/await}
</div>

<style>
  .graph {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1em;
  }
</style>
