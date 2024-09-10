<script>
  import Demo from "../../frontend/src/lib/Demo.svelte";
  import demoCodeGo from "./assets/demo.go?raw";
  import demoCodeC from "./assets/demo.c?raw";
</script>

<main>
  <Demo codeGo={demoCodeGo} codeC={demoCodeC} />
</main>

<style>
  main {
    width: 100dvw;
    height: 100dvh;
  }
</style>
