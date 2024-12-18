<script lang="ts">
  import Demo from "../../components/Demo.svelte";
  import demoCodeGo from "./assets/demo.go?raw";
  import demoCodeC from "./assets/demo.c?raw";
  import demoCodePython from "./assets/demo.py?raw";
  import demoCodeCpp from "./assets/demo.cpp?raw";
  import demoCodeTypeScript from "./assets/demo.ts?raw"
  import { isDark } from "../../components/lightdark";
  import { onDestroy } from "svelte";
  import type { Language } from "../../control-flow/cfg.ts";

  document.body.dataset.theme = isDark ? "dark" : "light";

  const unsubscribe = isDark.subscribe((isDark) => {
    document.body.dataset.theme = isDark ? "dark" : "light";
  });

  // ADD-LANGUAGES-HERE
  const code: { [language in Language]?: string } = {
    C: demoCodeC,
    Python: demoCodePython,
    Go: demoCodeGo,
    "C++": demoCodeCpp,
    TypeScript: demoCodeTypeScript,
  };

  onDestroy(unsubscribe);
</script>

<main>
  <Demo {code} />
</main>

<style>
  main {
    width: 100dvw;
    height: 100dvh;
  }
</style>
