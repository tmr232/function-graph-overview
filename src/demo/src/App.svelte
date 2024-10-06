<script>
  import Demo from "../../components/Demo.svelte";
  import demoCodeGo from "./assets/demo.go?raw";
  import demoCodeC from "./assets/demo.c?raw";
  import demoCodePython from "./assets/demo.py?raw";
</script>

<main>
  <Demo codeGo={demoCodeGo} codeC={demoCodeC} codePython={demoCodePython} />
</main>

<style>
  main {
    width: 100dvw;
    height: 100dvh;
  }
</style>
