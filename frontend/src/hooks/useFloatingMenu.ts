import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface FloatingMenuCoords {
  top: number;
  right: number;
}

/**
 * Shared open/close + positioning logic for the small "..." dropdown
 * menus (TrackDropdown, ArtistRow's external-artist menu).
 *
 * These used to rely on being an absolutely-positioned child of the
 * trigger icon -- but every one of these menus lives inside a scrollable
 * list (Quick Picks, Recommended Artist, Library's liked songs, ...), and
 * an ancestor's `overflow: auto` clips ANY descendant that extends past
 * its edge, position:absolute or not. Depending on where the row sits in
 * its own scroll container, the menu could show fully, partially, or not
 * at all -- there's no fixing that by adjusting the menu's own position,
 * since the clip happens at the scrolling ancestor regardless of where
 * the menu itself is placed.
 *
 * The menu is rendered through a portal into document.body instead
 * (paired with `position: fixed` in CSS), positioned from the trigger's
 * own on-screen coordinates via getBoundingClientRect -- escaping every
 * ancestor's overflow entirely, the same reason Modal.tsx uses a portal
 * for the same class of clipping/stacking problem.
 */
export function useFloatingMenu<T extends HTMLElement = HTMLElement>() {
  const [open, setOpenState] = useState(false);
  const [coords, setCoords] = useState<FloatingMenuCoords | null>(null);
  const triggerRef = useRef<T>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Guards the flip-above-the-trigger adjustment below to run at most once
  // per open -- without it, the effect that measures the rendered menu
  // and the state update it makes would keep re-triggering each other.
  const flippedRef = useRef(false);

  const setOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    flippedRef.current = false;
    setOpenState(value);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setCoords(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }, [open]);

  // Always opening downward ran the menu past the bottom of the browser
  // window for any row near the bottom of the page -- there's no way to
  // know the menu's real height before it's rendered once, so this
  // measures the actual rendered menu and, if it overflows, flips it to
  // open upward from the trigger instead.
  useLayoutEffect(() => {
    if (!open || !coords || flippedRef.current) return;
    const menuRect = menuRef.current?.getBoundingClientRect();
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    if (!menuRect || !triggerRect) return;
    if (menuRect.bottom > window.innerHeight) {
      flippedRef.current = true;
      setCoords({
        top: Math.max(8, triggerRect.top - menuRect.height - 4),
        right: window.innerWidth - triggerRect.right,
      });
    }
  }, [open, coords]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    // The menu's fixed coordinates are computed once, on open -- rather
    // than tracking every scroll continuously, just close it if the page
    // (or the list it's in) scrolls out from under it. `capture: true` so
    // this fires for a scroll on any ancestor container, not just window.
    const onScrollOrResize = () => setOpen(false);

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, setOpen]);

  return { open, setOpen, coords, triggerRef, menuRef };
}
