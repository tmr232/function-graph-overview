<script>
  import Demo from "../../frontend/src/lib/Demo.svelte";
  import demoCode from "./assets/demo.go?raw";
</script>

<main>
  <Demo code={demoCode} />
</main>

<style>
  main {
    width: 100dvw;
    height: 100dvh;
  }
</style>
