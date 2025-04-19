<script lang="ts">
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
import { onMount } from "svelte";

const demoDot = `
digraph G {
    node [style=filled bgcolor=gray]
    A -> B0
    A -> B1
    B0 -> C0
    B0 -> C1
    B1 -> C2
    B1 -> C3
}
`;
let panzoom: PanzoomObject | undefined;

function makeZoomable() {
  const elem = document.querySelector(".panzoom") as HTMLElement;
  panzoom = Panzoom(elem, { maxScale: 100, minScale: 1 });
  elem.parentElement.addEventListener("wheel", panzoom.zoomWithWheel);
}

onMount(() => {
  makeZoomable();
});

function getClickedNode(target: Element): Element | undefined {
  while (
    target.tagName !== "div" &&
    target.tagName !== "svg" &&
    !target.classList.contains("node") &&
    target.parentElement !== null
  ) {
    target = target.parentElement;
  }
  if (!target.classList.contains("node")) {
    return undefined;
  }
  return target;
}

function getBaseClientRect() {
  const baseElement = document.querySelector(".panzoom");
  if (!baseElement) {
    throw new Error("Could not find base element!");
  }

  return baseElement.getBoundingClientRect();
}

function onClick(event: MouseEvent) {
  let target: Element = event.target as Element;
  target = getClickedNode(target);
  if (!target) {
    return;
  }
  /*
    We get the position of the target relative to the `panzoom` element.
    This allows us to pan with absolute coordinates, which is important
    if the user clicks mid-move.
    We scale the distances by the zoom scale, as the pan is relative to the
    original size, not the scaled size.
     */
  const nodeClientRect = target.getBoundingClientRect();
  const baseClientRect = getBaseClientRect();
  const relativeX = nodeClientRect.x - baseClientRect.x;
  const relativeY = nodeClientRect.y - baseClientRect.y;
  const midX = baseClientRect.width / 2;
  const midY = baseClientRect.height / 2;
  const scale = panzoom.getScale();
  // TODO: Only pan if the target is far enough from the center.
  panzoom.pan(
    (midX - relativeX - nodeClientRect.width / 2) / scale,
    (midY - relativeY - nodeClientRect.height / 2) / scale,
    { animate: true },
  );
}

function onKeyDown(event: KeyboardEvent) {
  console.log("onKeyDown", event);
  switch (event.key) {
    case "r":
      panzoom?.pan(0, 0, { animate: true });
  }
}
</script>

<div class="main">
  <div class="graph" onclick={onClick}>
    <div class="panzoom">
    {#await Graphviz.load()}
      Loading...
    {:then graphviz }
      {@html graphviz.dot(demoDot)}
    {/await}
    </div>
    <div class="crosshair">
    </div>
  </div>
</div>

<svelte:window on:keydown|preventDefault={onKeyDown} />

<style>
    .main {
        display: flex;
        justify-content: center;
        align-items: center;

        width:100dvw;
        height: 100dvh;
    }

    .graph {
        height: 50dvh;
        width: 50dvw;
        overflow: hidden;
        position: relative;
    }

    .graph :global(svg) {
        height: 150%;
        width: 150%;
    }

    .crosshair {
        position: absolute;
        z-index: 10000;
        left: calc(50% - 2.5px);
        top: calc(50% - 2.5px);
        width: 5px;
        height: 5px;
        border-radius: 5px;
        background-color: green;
        pointer-events: none;
    }
</style>

