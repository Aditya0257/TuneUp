import { useEffect, type RefObject } from 'react';

/**
 * Port of draggableDiv.js.
 *
 * The homepage panel slides right to reveal the "backpage" (queue + player)
 * behind it. Dragging only starts within the first 38px of the panel's left
 * edge, exactly as the original did, so clicks anywhere else still work.
 *
 * Changes: uses pointer events instead of mouse events so it works on touch,
 * clamps against the element's own width rather than `screen.width` (the
 * original compared a CSS pixel offset against physical screen width, which
 * behaved differently on scaled displays), and cleans its listeners up.
 */
const GRAB_ZONE_PX = 38;
const MAX_OFFSET_PERCENT = 36.8;

export function useHorizontalDrag(ref: RefObject<HTMLElement>): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let dragging = false;
    let pointerId: number | null = null;
    let grabOffset = 0;

    const onPointerDown = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      if (event.clientX - rect.left >= GRAB_ZONE_PX) return;

      dragging = true;
      pointerId = event.pointerId;
      grabOffset = event.clientX - element.offsetLeft;
      element.style.transition = 'left 0.15s';
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointerId) return;
      event.preventDefault();

      const nextLeft = event.clientX - grabOffset;
      const maxLeft = (window.innerWidth * MAX_OFFSET_PERCENT) / 100;
      element.style.left = `${Math.min(Math.max(nextLeft, 0), maxLeft)}px`;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      dragging = false;
      pointerId = null;
      element.style.transition = 'left 0.4s';
    };

    element.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [ref]);
}
