<script lang="ts">
import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
import type { Action } from "svelte/action";
import { registerPanzoomOnclick } from "./panzoom-utils.ts";


type OnclickFactory = (
  panzoom: PanzoomObject,
  elem: HTMLElement,
) => (event: MouseEvent | TouchEvent | PointerEvent) => void;

let {
  dragThreshold,
  onclickFactory,
  content,
}: { dragThreshold: number; onclickFactory: OnclickFactory, content:any } = $props();

let panzoom:PanzoomObject|undefined;

export function reset() {
    panzoom?.reset();
}

type ZoomConfig = {
  onclickFactory: OnclickFactory;
  dragThreshold: number;
};
const zoomable: Action<HTMLElement, ZoomConfig> = (
  node: HTMLElement,
  data: ZoomConfig,
) => {
  panzoom = Panzoom(node, { maxScale: 100, minScale: 1 });
  node.parentElement?.addEventListener("wheel", panzoom.zoomWithWheel);
  const onclick = data.onclickFactory(panzoom, node);
  registerPanzoomOnclick(
    node,
    (e) => onclick(e.detail.originalEvent),
    data.dragThreshold,
  );
};
</script>

<div class="panzoom" use:zoomable={{onclickFactory, dragThreshold}}>
  {@render content?.()}
</div>
