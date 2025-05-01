<script lang="ts">
import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
import type { Action } from "svelte/action";
import { registerPanzoomOnclick } from "../panzoom/src/panzoom-utils.ts";
import type { Snippet } from "svelte";



type ClickHandler = (event: MouseEvent | TouchEvent | PointerEvent, panzoom:PanzoomObject, zoomElement:HTMLElement) => void;

let {
  dragThreshold=5,
  onclick,
  children,
}: { dragThreshold: number; onclick: ClickHandler, children:Snippet } = $props();

let panzoom:PanzoomObject;

export function reset() {
    panzoom?.reset();
}

type ZoomConfig = {
  dragThreshold: number;
};
const zoomable: Action<HTMLElement, ZoomConfig> = (
  node: HTMLElement,
  data: ZoomConfig,
) => {
  panzoom = Panzoom(node, { maxScale: 100, minScale: 1 });
  node.parentElement?.addEventListener("wheel", panzoom.zoomWithWheel);
    registerPanzoomOnclick(
    node,
    (e) => onclick(e.detail.originalEvent, panzoom, node),
    data.dragThreshold,
  );
};
</script>

<div class="panzoom" use:zoomable={{dragThreshold}}>
  {@render children?.()}
</div>

<style>
  .panzoom {
      width: 100%;
      height: 100%;
  }
</style>