<script lang="ts">
import { onDestroy } from "svelte";
import Demo from "../../components/Demo.svelte";
import { isDark } from "../../components/lightdark";
import type { Language } from "../../control-flow/cfg.ts";
import demoCodeC from "./assets/demo.c?raw";
import demoCodeCpp from "./assets/demo.cpp?raw";
import demoCodeCSharp from "./assets/demo.cs?raw";
import demoCodeGo from "./assets/demo.go?raw";
import demoCodeJava from "./assets/demo.java?raw";
import demoCodePython from "./assets/demo.py?raw";
import demoCodeTypeScript from "./assets/demo.ts?raw";

document.body.dataset.theme = isDark ? "dark" : "light";

const unsubscribe = isDark.subscribe((isDark) => {
  document.body.dataset.theme = isDark ? "dark" : "light";
});

// ADD-LANGUAGES-HERE
const code: { [language in Language]?: string } = {
  C: demoCodeC,
  "C#": demoCodeCSharp,
  Java: demoCodeJava,
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
