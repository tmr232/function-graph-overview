<script lang="ts">
  import CodeMirror from "svelte-codemirror-editor";
  import { go } from "@codemirror/lang-go";
  import { cpp } from "@codemirror/lang-cpp";
  import Graph from "./Graph.svelte";
  import type { Language } from "../../../control-flow/cfg";

  export let codeGo = "func Example() {\n\tif x {\n\t\treturn\n\t}\n}";
  export let codeC = "void main() {\n\tif (x) {\n\t\treturn;\n\t}\n}";

  let languages: {
    language: Language;
    text: string;
  }[] = [
    { language: "Go" as Language, text: "Go" },
    { language: "C" as Language, text: "C" },
  ];
  let selection = languages[0];
  let code = codeGo;
  $: {
    switch (selection.language) {
      case "C":
        code = codeC;
        break;
      case "Go":
        code = codeGo;
        break;
    }
  }

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
  <div class="editor">
    <div class="controls">
      <select bind:value={selection} on:change={(e) => console.log(selection)}>
        {#each languages as language}
          <option value={language}>
            {language.text}
          </option>
        {/each}
      </select>
    </div>
    <div class="codemirror">
      {#if selection.language === "Go"}
        <CodeMirror
          bind:value={codeGo}
          lang={go()}
          tabSize={4}
          lineWrapping={true}
        />
      {:else}
        <CodeMirror
          bind:value={codeC}
          lang={cpp()}
          tabSize={4}
          lineWrapping={true}
        />
      {/if}
    </div>
  </div>
  <div class="graph">
    <div class="controls">
      <input type="checkbox" id="simplify" bind:checked={simplify} />
      <label for="simplify">Simplify</label>

      <input type="checkbox" id="flatSwitch" bind:checked={flatSwitch} />
      <label for="flatSwitch">Flat Switch</label>
    </div>
    <Graph {code} language={selection.language} {simplify} {flatSwitch} />
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

  .codemirror {
    padding-top: 1rem;
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
