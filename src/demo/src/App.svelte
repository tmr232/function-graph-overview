<script lang="ts">
  import Demo from "../../components/Demo.svelte";
  import demoCodeGo from "./assets/demo.go?raw";
  import demoCodeC from "./assets/demo.c?raw";
  import demoCodePython from "./assets/demo.py?raw";
  import demoCodeCpp from "./assets/demo.cpp?raw";
  import demoCodeTypeScript from "./assets/demo.ts?raw";
  import { isDark } from "../../components/lightdark";
  import { onDestroy } from "svelte";
  import type { Language } from "../../control-flow/cfg.ts";
  import { SVG } from "@svgdotjs/svg.js";

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

  function overlayNodes(nodeNames: string[]): void {
    let svg = SVG(document.querySelector("svg"));
    const makeDeepClone = true;
    const assignNewIds = false;
    let temp = svg.clone(makeDeepClone, assignNewIds);
    let graph = temp.findOne("#graph0");
    let group = temp.group();
    group.transform(graph.transform());
    for (const nodeName of nodeNames) {
      group.add(graph.findOne(`#${nodeName}`));
    }

    let overlayGroup = svg.group();
    overlayGroup.transform(svg.findOne("#graph0").transform());
    const padding = 20;
    overlayGroup
      .rect(group.width() + padding * 2, group.height() + padding * 2)
      .move(group.x() - padding, group.y() - padding)
      .fill("#ff00ff44");
    overlayGroup
      .text("Hello, World!")
      .fill("#000")
      .move(group.x(), group.y() - padding);
    overlayGroup.css({ "pointer-events": "none" });
  }
  window.overlayNodes = overlayNodes;
  window.SVG = SVG;

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
