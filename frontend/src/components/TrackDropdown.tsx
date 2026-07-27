import { useEffect, useRef, useState, type MouseEvent } from 'react';

import { usePlayer } from '@/player/PlayerContext';
import type { Song } from '@/types';

/**
 * "Add to Queue" / "Play Next" menu.
 *
 * The original `toggleDropdown` queried every `.dropdown-content` on the page
 * and set inline `display` on each one to emulate "close the others". Local
 * state plus an outside-click listener does the same thing without touching
 * other components' DOM.
 *
 * Both actions used to cost a network round trip per click (the old
 * /playSong route had to resolve a stream URL). We already hold the metadata,
 * so they are now instant.
 */
export function TrackDropdown({ song }: { song: Song }) {
  const { addToQueue, playNext } = usePlayer();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onDocumentPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onDocumentPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onDocumentPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (event: MouseEvent, action: 'queue' | 'next') => {
    event.preventDefault();
    event.stopPropagation();
    if (action === 'queue') addToQueue(song);
    else playNext(song);
    setOpen(false);
  };

  return (
    <div className="dropdown" ref={containerRef}>
      <i
        className="fa-solid fa-ellipsis"
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More options for ${song.title}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            setOpen((value) => !value);
          }
        }}
      />
      <div className="dropdown-content" style={{ display: open ? 'block' : 'none' }} role="menu">
        <a href="#" role="menuitem" onClick={(event) => choose(event, 'queue')}>
          Add to Queue
        </a>
        <a href="#" role="menuitem" onClick={(event) => choose(event, 'next')}>
          Play Next
        </a>
      </div>
    </div>
  );
}
