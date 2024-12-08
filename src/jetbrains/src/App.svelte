<script lang="ts">
  import { isDark } from "../../components/lightdark";
  import { onDestroy } from "svelte";
  import Jetbrains from "../../components/Jetbrains.svelte";
  import { isValidLanguage, type Language } from "../../control-flow/cfg";
  import {
    deserializeColorList,
    type ColorList,
  } from "../../control-flow/colors";
  import * as defaultDark from "./defaultDark.json";
  document.body.dataset.theme = isDark ? "dark" : "light";

  let colorList: ColorList = defaultDark.scheme as ColorList;
  document.body.style.backgroundColor = colorList.find(
    ({ name }) => name === "graph.background",
  ).hex;

  const unsubscribe = isDark.subscribe((isDark) => {
    document.body.dataset.theme = isDark ? "dark" : "light";
  });

  onDestroy(unsubscribe);

  let display: Jetbrains;

  let codeAndOffset: {
    code: string;
    offset: number;
    language: Language;
  } | null = null;

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

  function navigateTo(
    e: CustomEvent<{ node: string; offset: number | null }>,
  ): void {
    console.log("navigateTo", e);
    if (e.detail.offset !== null && window.navigateTo)
      window.navigateTo(e.detail.offset.toString());
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
  <Jetbrains
    {codeAndOffset}
    bind:this={display}
    {colorList}
    on:node-clicked={navigateTo}
  />
</main>

<style>
  main {
    width: 100%;
    height: 100%;
  }
</style>
