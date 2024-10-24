<script lang="ts">
  import { isDark } from "../../components/lightdark";
  import { onDestroy } from "svelte";
  import Jetbrains from "../../components/Jetbrains.svelte";
  import { isValidLanguage, type Language } from "../../control-flow/cfg";
  import { deserializeColorList } from "../../control-flow/colors";

  document.body.dataset.theme = isDark ? "dark" : "light";

  const unsubscribe = isDark.subscribe((isDark) => {
    document.body.dataset.theme = isDark ? "dark" : "light";
  });

  onDestroy(unsubscribe);

  let display: Jetbrains;

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
  window.setColors = (colors: string) => {
    if (!display) return;

    try {
      const colorList = deserializeColorList(colors);
      display.applyColors(colorList);
      document.body.style.backgroundColor = colorList.find(
        ({ name }) => name === "graph.background",
      ).hex;
    } catch (error) {
      console.trace(error);
      return;
    }
  };
</script>

<main>
  <Jetbrains {codeAndOffset} bind:this={display} />
</main>

<style>
  main {
    width: 100%;
    height: 100%;
  }
</style>
