<script lang="ts">
import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
import type { Snippet } from "svelte";
import type { Action } from "svelte/action";
import {
  calculatePanToCenter,
  registerPanzoomOnclick,
} from "./panzoom-utils.ts";

type ClickHandler = (
  event: MouseEvent | TouchEvent | PointerEvent,
  panzoom: PanzoomObject,
  zoomElement: HTMLElement,
) => void;

let {
  dragThreshold = 5,
  disabled = false,
  onclick,
  children,
}: {
  dragThreshold?: number;
  disabled?: boolean;
  onclick: ClickHandler;
  children: Snippet;
} = $props();

let panzoom: PanzoomObject;
let panzoomElement: HTMLElement;

export function reset() {
  panzoom?.reset();
}

export function panTo(query: string) {
  const target = panzoomElement.querySelector(query);
  if (!target) {
    return;
  }
  panzoom.pan(
    ...calculatePanToCenter(
      target.getBoundingClientRect(),
      panzoomElement.getBoundingClientRect(),
      panzoom.getScale(),
    ),
    { animate: true },
  );
}

$effect(() => {
  if (!panzoom) {
    return;
  }
  if (disabled) {
    panzoom.setOptions({
      disableZoom: true,
      disablePanZoom: true,
      disablePan: true,
    });
    panzoom.reset({ animate: true, force: true });
  } else {
    panzoom.setOptions({
      disableZoom: false,
      disablePanZoom: false,
      disablePan: false,
    });
  }
});

type ZoomConfig = {
  dragThreshold: number;
};
const zoomable: Action<HTMLElement, ZoomConfig> = (
  node: HTMLElement,
  data: ZoomConfig,
) => {
  panzoom = Panzoom(node, {
    maxScale: 100,
    minScale: 1,
    contain: "outside",
    cursor: "default",
    duration: 300,
  });
  node.parentElement?.addEventListener("wheel", panzoom.zoomWithWheel);
  registerPanzoomOnclick(
    node,
    (e) => onclick(e.detail.originalEvent, panzoom, node),
    data.dragThreshold,
  );
};
</script>

<div class="panzoom" use:zoomable={{dragThreshold}} bind:this={panzoomElement}>
  {@render children?.()}
</div>

<style>
  .panzoom {
      width: 100%;
      height: 100%;
  }
</style>