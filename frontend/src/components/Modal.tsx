import { useEffect } from 'react';
import type { ReactNode } from 'react';

/**
 * A small shared overlay for the sidebar's About/Settings panels -- neither
 * existed in the original app (the icons that open them were decorative),
 * so there's no legacy markup to port here.
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

  return (
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
    </div>
  );
}
