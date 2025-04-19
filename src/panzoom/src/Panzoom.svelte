<script lang="ts">
  import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
  import { calculatePanToCenter, registerPanzoomOnclick } from "./panzoom-utils.ts";
  import type { Action } from "svelte/action";


let panzoom: PanzoomObject | undefined;

const zoomable:Action = (node:HTMLElement)=> {
  panzoom = Panzoom(node, { maxScale: 100, minScale: 1 });
  node.parentElement?.addEventListener("wheel", panzoom.zoomWithWheel);
  registerPanzoomOnclick(node, (e)=>panToEventTarget(e.detail.originalEvent), 5);
}

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



</script>

<div class="panzoom" use:zoomable>
</div>


