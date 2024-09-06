<script lang="ts">
    import Graph from "./Graph.svelte";
    import CodeMirror from "svelte-codemirror-editor";
    import { go } from "@codemirror/lang-go";
    import SimpleGraph from "./SimpleGraph.svelte";


    let code="func Example() {\n\tif x {\n\t\treturn\n\t}\n}";
</script>

<main>
    <header>
        <h1>Function Graph Overview</h1>
    </header>
    <div>
    <div class="editor">
    <CodeMirror bind:value={code} lang={go()} tabSize={4} lineWrapping={true} />
</div>
</div>
<div class="graph">
    <SimpleGraph code={code}/>
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
        "editor graph"
        ;
    }
    header {
        grid-area: header;
        font-family: Arial, Helvetica, sans-serif;
        text-align: center;
        filter: drop-shadow(0 0 0.3rem gray);
        background-color: white;;
    }
    .graph, .editor {
        background-color: white;
        filter: drop-shadow(0 0 0.3rem gray);
    }
</style>