<script lang="ts">
  import CodeMirror from "svelte-codemirror-editor";
  import { go } from "@codemirror/lang-go";
  import Graph from "./Graph.svelte";

  export let code = "func Example() {\n\tif x {\n\t\treturn\n\t}\n}";

  let simplify = true;
  let flatSwitch = false;
</script>

<main>
  <header>
    <h1>Function Graph Overview</h1>
    <div class="links">
      <a href="https://github.com/tmr232/function-graph-overview/">Repo</a>
      <a
        href="https://marketplace.visualstudio.com/items?itemName=tamir-bahar.function-graph-overview"
        >Install</a
      >
    </div>
  </header>
  <div>
    <div class="editor">
      <CodeMirror
        bind:value={code}
        lang={go()}
        tabSize={4}
        lineWrapping={true}
      />
    </div>
  </div>
  <div class="graph">
    <div class="controls">
      <input type="checkbox" id="simplify" bind:checked={simplify} />
      <label for="simplify">Simplify</label>

      <input type="checkbox" id="flatSwitch" bind:checked={flatSwitch} />
      <label for="flatSwitch">Flat Switch</label>
    </div>
    <Graph {code} {simplify} {flatSwitch} />
  </div>
</main>

<style>
  main {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    /* width: 90%; */
    padding: 2em;
    grid-template-areas:
      "header header"
      "editor graph";
  }
  header {
    grid-area: header;
    font-family: Arial, Helvetica, sans-serif;
    text-align: center;
    filter: drop-shadow(0 0 0.3rem gray);
    background-color: white;
    position: relative;
  }
  .controls {
    font-family: Arial, Helvetica, sans-serif;
    margin-top: 1rem;
    margin-left: 1rem;
  }
  .graph,
  .editor {
    background-color: white;
    filter: drop-shadow(0 0 0.3rem gray);
  }

  .links a {
    color: black;
    padding: 0.5rem;
  }

  .links a:hover {
    background-color: lightskyblue;
    padding: 0.5rem;
  }
  .links {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    position: absolute;
    right: 3rem;
    top: 0;
    height: 100%;
  }
</style>
