import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * A small shared overlay for the sidebar's About/Settings panels -- neither
 * existed in the original app (the icons that open them were decorative),
 * so there's no legacy markup to port here.
 *
 * Rendered via a portal directly into <body>, not inline where it's used
 * (inside the sidebar). The reason this was invisible for a long time
 * despite z-index: 900: .fixed_side_navbar has no z-index of its own, and
 * .homepage/.searchpage/.playlistspage (etc.) all have an explicit
 * z-index: 3. A positioned element with a real z-index always paints above
 * one with z-index: auto, no matter how high a *descendant's* z-index is --
 * so this modal was rendering the whole time, just behind the current page,
 * because it lived inside the sidebar's (lower) stacking context. Nothing
 * else in the sidebar visually overlaps page content, which is why this
 * never surfaced until a full-screen modal did. A portal escapes that
 * hierarchy entirely instead of trying to out-rank it with a bigger number.
 */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="tuneup_modal_backdrop" onClick={onClose}>
      <div
        className="tuneup_modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tuneup_modal_header">
          <h2>{title}</h2>
          <button type="button" className="tuneup_modal_close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
        <div className="tuneup_modal_body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
