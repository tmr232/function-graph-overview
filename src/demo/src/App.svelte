<script lang="ts">
  import Demo from "../../components/Demo.svelte";
  import demoCodeGo from "./assets/demo.go?raw";
  import demoCodeC from "./assets/demo.c?raw";
  import demoCodePython from "./assets/demo.py?raw";
  import { isDarkTheme } from "../../components/lightdark";

  document.body.dataset.theme = isDarkTheme() ? "dark" : "light";
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
