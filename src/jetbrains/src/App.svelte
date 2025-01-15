<script lang="ts">
  /*
  We need to define the interfaces here clearly, and then implement them.

  In:
    - code
    - offset
    - config

  Out:
    - offset (on click)


  ## Caching

  We should be able to do basic caching when viewing the same function.
  On new {code, offset}, we:
  1. Check if the code is the same - if it is not, we start from scratch
  2. If it is, check if we're inside the same function. If it is - only change
     highlight.

  We should also be able to cache multiple functions in the same file, or more
  complex things, but that's later.

  We should split things into "IDE drivers" that get the input from the IDE
  or send it back, and the "application level" that should be unified.

  On load, we should default to a dark placeholder, and change to light one
  only when we know we should.
  Alternatively, we can avoid rendering anything before the color-scheme is set.
  It _feels_ a bit slow, but should be near instant and avoid flashing.

  I should probably write type-definitions for the VSCode and JetBrains APIs
  so that it all looks nice here.

  At a later stage, all the rendering code should be unified into a library
  and put in a class. Repeating it for anything that needs to draw a graph
  with some config is a mess. And would be more of a mess once we add
  overlays and panzoom, and all the fun features. It's better to have as many
  of those features in one place only.
   */
  import { isDark } from "../../components/lightdark";
  import { onDestroy } from "svelte";
  import Jetbrains from "../../components/Jetbrains.svelte";
  import {
    isValidLanguage,
    type Language,
  } from "../../control-flow/cfg";
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

  const vscode = acquireVsCodeApi ? acquireVsCodeApi() : undefined;

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
    if (e.detail.offset === null) {
      // We don't know the offset, so we can't navigate to it.
      // TODO: Check if this can actually happen now.
      //       We changed the representation of nodes, so it shouldn't.
      return;
    }
    // Handle JetBrains, which registers a `navigateTo` global function
    if (window.navigateTo) {
      window.navigateTo(e.detail.offset.toString());
    } else {
      // Handle VSCode
      console.log("Node clicked! Posting message", e.detail.offset);
      vscode?.postMessage({ event: "node-clicked", offset: e.detail.offset });
    }
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

  let simplify = true;
  let flatSwitch = false;
  let highlight = true;
  window.setSimplify = (flag: boolean) => (simplify = flag);
  window.setFlatSwitch = (flag: boolean) => (flatSwitch = flag);
  window.setHighlight = (flag: boolean) => (highlight = flag);

  function initVSCode() {
    if (!vscode) {
      // We're not running in VSCode
      return;
    }
    console.log("Initializing VSCode API");
    // Handle messages sent from the extension to the webview
    window.addEventListener("message", (event) => {
      console.log("Received message", event.data);
      const message = event.data; // The json data that the extension sent
      switch (message.type) {
        case "updateCode": {
          setCode(message.code, message.offset, message.language);
          break;
        }
      }
    });

    const onClick = (event) => {
      let target = event.target;
      while (
        target.tagName !== "div" &&
        target.tagName !== "svg" &&
        !target.classList.contains("node")
      ) {
        target = target.parentElement;
      }
      if (!target.classList.contains("node")) {
        return;
      }
      vscode.postMessage({ event: "node-clicked", node: target.id });
    };

    window.addEventListener("click", onClick);
  }

  initVSCode();
</script>

<main>
  <Jetbrains
    {codeAndOffset}
    bind:this={display}
    {colorList}
    {simplify}
    {flatSwitch}
    {highlight}
    on:node-clicked={navigateTo}
  />
</main>

<style>
  main {
    width: 100%;
    height: 100%;
  }
</style>
