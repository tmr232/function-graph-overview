<script lang="ts">
  import { isDark } from "../../components/lightdark";
  import { onDestroy } from "svelte";
  import Jetbrains from "../../components/Jetbrains.svelte";

  document.body.dataset.theme = isDark ? "dark" : "light";

  const unsubscribe = isDark.subscribe((isDark) => {
    document.body.dataset.theme = isDark ? "dark" : "light";
  });

  onDestroy(unsubscribe);

  let code = `
def f():
    if x:
        pass
`;
  let cursorOffset = 15;

  let codeAndOffset = { code, offset: cursorOffset };

  function setCode(newCode: string, offset: number) {
    codeAndOffset = { code: newCode, offset };
    console.log(newCode, offset);
  }

  window.setCode = setCode;
</script>

<main>
  <Jetbrains {codeAndOffset} language="Python" />
</main>

<style>
  main {
    width: 100dvw;
    height: 100dvh;
  }
</style>
