<script lang="ts" context="module">
  import type { MessageToVscode } from "../../vscode/messages.ts";

  declare const acquireVsCodeApi:
    | undefined
    | (() => {
        postMessage<T extends MessageToVscode>(message: T): void;
      });
</script>

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

  import Jetbrains from "../../components/Jetbrains.svelte";
  import { isValidLanguage, type Language } from "../../control-flow/cfg";
  import {
    deserializeColorList,
    type ColorList,
    getDarkColorList,
    getLightColorList,
  } from "../../control-flow/colors";
  import * as jetbrainsDarkTheme from "./defaultDark.json";
  import type { MessageToWebview, NavigateTo } from "../../vscode/messages.ts";

  let simplify = true;
  let flatSwitch = false;
  let highlight = true;

  // Set initial background color
  let colorList = (function () {
    function isDarkTheme(): boolean {
      return document.body.dataset.theme !== "light";
    }
    // This is the JetBrains colorlist
    let colorList: ColorList = jetbrainsDarkTheme.scheme as ColorList;
    if (acquireVsCodeApi) {
      // This is the VSCode colorList
      colorList = getDarkColorList();
    }
    if (!isDarkTheme()) {
      colorList = getLightColorList();
    }
    document.body.style.backgroundColor = colorList.find(
      ({ name }) => name === "graph.background",
    ).hex;

    return colorList;
  })();

  let display: Jetbrains;

  type Config = {
    simplify?: boolean;
    flatSwitch?: boolean;
    highlight?: boolean;
    colorList?: ColorList;
  };
  type State = {
    code?: string;
    offset?: number;
    language?: Language;
    config?: Config;
  };
  class StateHandler {
    private state: State = {
      config: { simplify: true, flatSwitch: false, highlight: true },
    };
    private navigateToHandlers: ((offset: number) => void)[] = [];
    public update(state: Partial<State>): void {
      const config = Object.assign(this.state.config, state.config);
      Object.assign(this.state, state);
      this.state.config = config;

      simplify = Boolean(this.state.config.simplify);
      flatSwitch = Boolean(this.state.config.flatSwitch);
      highlight = Boolean(this.state.config.highlight);

      setCode(this.state.code, this.state.offset, this.state.language);
    }
    public onNavigateTo(callback: (offset: number) => void): void {
      this.navigateToHandlers.push(callback);
    }

    public navigateTo(offset: number): void {
      for (const handler of this.navigateToHandlers) {
        handler(offset);
      }
    }
  }

  function initVSCode(stateHandler: StateHandler): void {
    const vscode = acquireVsCodeApi ? acquireVsCodeApi() : undefined;

    if (!vscode) {
      // We're not running in VSCode
      return;
    }
    console.log("Initializing VSCode API");
    // Handle messages sent from the extension to the webview
    window.addEventListener("message", (event: { data: MessageToWebview }) => {
      console.log("Received message", event.data);
      const message = event.data; // The json data that the extension sent
      switch (message.tag) {
        case "updateCode": {
          stateHandler.update({
            code: message.code,
            offset: message.offset,
            language: message.language,
          });
          break;
        }
        case "updateSettings":
          flatSwitch = message.flatSwitch;
          simplify = message.simplify;
          highlight = message.highlightCurrentNode;
          colorList = message.colorList;
          document.body.style.backgroundColor = colorList.find(
            ({ name }) => name === "graph.background",
          ).hex;
      }
    });

    stateHandler.onNavigateTo((offset: number) => {
      // Handle VSCode
      console.log("Node clicked! Posting message", offset);
      vscode?.postMessage<NavigateTo>({ tag: "navigateTo", offset: offset });
    });
  }

  function initJetBrains(stateHandler: StateHandler): void {
    stateHandler.onNavigateTo((offset: number) => {
      if (!window.navigateTo) {
        return;
      }
      window.navigateTo(offset.toString());
    });
  }

  const stateHandler = new StateHandler();
  initVSCode(stateHandler);
  initJetBrains(stateHandler);

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
    stateHandler.navigateTo(e.detail.offset);
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

  window.setSimplify = (flag: boolean) =>
    stateHandler.update({ config: { simplify: flag } });
  window.setFlatSwitch = (flag: boolean) =>
    stateHandler.update({ config: { flatSwitch: flag } });
  window.setHighlight = (flag: boolean) =>
    stateHandler.update({ config: { highlight: flag } });
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
