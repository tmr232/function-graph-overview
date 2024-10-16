<script lang="ts">
  import Demo from "../../components/Demo.svelte";
  import demoCodeGo from "./assets/demo.go?raw";
  import demoCodeC from "./assets/demo.c?raw";
  import demoCodePython from "./assets/demo.py?raw";
  import { isDark } from "../../components/lightdark";
  import { onDestroy } from "svelte";
  import Graph from "../../components/Graph.svelte";

  document.body.dataset.theme = isDark ? "dark" : "light";

  const unsubscribe = isDark.subscribe((isDark) => {
    document.body.dataset.theme = isDark ? "dark" : "light";
  });

  onDestroy(unsubscribe);

  let code = `
def f():
    if x:
        pass
`

  function setCode(newCode:string) {
    code = newCode;
  }

  window.setCode = setCode;
</script>

<main>
  <Graph {code} language="Python" />
</main>

<style>
  main {
    width: 100dvw;
    height: 100dvh;
  }
</style>
