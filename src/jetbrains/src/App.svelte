<script lang="ts">
  import { isDark } from "../../components/lightdark";
  import { onDestroy } from "svelte";
  import Jetbrains from "../../components/Jetbrains.svelte";
  import { isValidLanguage, type Language } from "../../control-flow/cfg";

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

  let codeAndOffset = {
    code,
    offset: cursorOffset,
    language: "Python" as Language,
  };

  function setCode(
    newCode: string,
    offset: number,
    language: string = "Python",
  ) {
    if (isValidLanguage(language)) {
      codeAndOffset = { code: newCode, offset, language };
    }
    console.log(newCode, offset, language);
  }

  window.setCode = setCode;
</script>

<main>
  <Jetbrains {codeAndOffset} />
</main>

<style>
  main {
    width: 100dvw;
    height: 100dvh;
  }
</style>
