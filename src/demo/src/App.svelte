<script lang="ts">
  import Demo from "../../components/Demo.svelte";
  import demoCodeGo from "./assets/demo.go?raw";
  import demoCodeC from "./assets/demo.c?raw";
  import demoCodePython from "./assets/demo.py?raw";
  import { isDark } from "../../components/lightdark";
  import { onDestroy } from "svelte";

  document.body.dataset.theme = isDark ? "dark" : "light";

  const unsubscribe = isDark.subscribe((isDark) => {
    document.body.dataset.theme = isDark ? "dark" : "light";
  });

  onDestroy(unsubscribe);
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
