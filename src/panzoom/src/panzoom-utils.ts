import type { PanzoomEventDetail } from "@panzoom/panzoom";

export function registerPanzoomOnclick(
  panzoomElement: Element,
  callback: (e: CustomEvent<PanzoomEventDetail>) => void,
  dragThreshold: number,
) {
  let startX = 0;
  let startY = 0;
  let movedSignificantly = false;

  function onPanzoomStart(e: CustomEvent<PanzoomEventDetail>) {
    startX = e.detail.x;
    startY = e.detail.y;
    movedSignificantly = false;
  }

  function onPanzoomChange(e: CustomEvent<PanzoomEventDetail>) {
    const diffX = Math.abs(e.detail.x - startX);
    const diffY = Math.abs(e.detail.y - startY);
    if (diffX > dragThreshold || diffY > dragThreshold) {
      movedSignificantly = true;
    }
  }

  function onPanzoomEnd(e: CustomEvent<PanzoomEventDetail>) {
    if (movedSignificantly) {
      // This was a drag operation
      return;
    }
    callback(e);
  }

  panzoomElement.addEventListener("panzoomchange", onPanzoomChange);
  panzoomElement.addEventListener("panzoomstart", onPanzoomStart);
  panzoomElement.addEventListener("panzoomend", onPanzoomEnd);
}

export function calculatePanToCenter(
  targetRect: DOMRect,
  panzoomRect: DOMRect,
  scale: number,
): [number, number] {
  const x =
    (panzoomRect.x +
      panzoomRect.width / 2 -
      (targetRect.x + targetRect.width / 2)) /
    scale;
  const y =
    (panzoomRect.y +
      panzoomRect.height / 2 -
      (targetRect.y + targetRect.height / 2)) /
    scale;
  return [x, y];
}
