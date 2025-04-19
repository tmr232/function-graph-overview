<script lang="ts">
  import { Graphviz } from "@hpcc-js/wasm-graphviz";
  import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
  import { onMount } from "svelte";
  import { calculatePanToCenter, registerPanzoomOnclick } from "./panzoom-utils.ts";

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
  elem.parentElement?.addEventListener("wheel", panzoom.zoomWithWheel);
  registerPanzoomOnclick(elem, (e)=>panToEventTarget(e.detail.originalEvent), 5);
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

function panToEventTarget(event: MouseEvent|TouchEvent|PointerEvent) {
  if (!panzoom) {return;}
  let target: Element |undefined = event.target as Element;
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
  panzoom.pan(...calculatePanToCenter(target.getBoundingClientRect(), getBaseClientRect(), panzoom.getScale()), {animate:true});
}

function onKeyDown(event: KeyboardEvent) {
  switch (event.key) {
    case "r":
      panzoom?.pan(0, 0, { animate: true });
  }
}
</script>

<div class="main">
  <div class="graph">
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

