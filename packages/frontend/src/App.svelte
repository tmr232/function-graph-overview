<script>
  import Graph from "./lib/Graph.svelte";

  import golangSample from "./assets/sample1.go?raw";
  import SampleViewer from "./lib/SampleViewer.svelte";
  import { bla } from "control-flow";
  bla();
</script>

<!-- <Sandbox /> -->
<main>
  <!-- <Graph code={golangSample} simplify={false} verbose={true} trim={false} /> -->
  <SampleViewer />
  <!-- <Graph code={golangSample} simplify={true} /> -->
</main>

<style>
  main {
    width: 100dvw;
    height: 100dvh;
  }
</style>
