/**
 * Loading / empty / error feedback. The original had none of these -- an
 * XHR that returned anything other than 200 left the page silently blank.
 *
 * Rendered as a centered card rather than a thin line of text -- these
 * states (especially "nothing found") are common enough in normal use
 * (an unreachable YouTube Music, an obscure search) that they need to read
 * as an intentional part of the app, not a leftover debug string.
 */
export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="status_card" role="status">
      <span className="status_spinner" aria-hidden="true" />
      <p className="status_message_text">{label}</p>
    </div>
  );
}

export function ErrorMessage({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="status_card status_error" role="alert">
      <i className="fa-solid fa-triangle-exclamation status_icon_large" aria-hidden="true" />
      <p className="status_message_text">{message}</p>
      {hint && <p className="status_message_hint">{hint}</p>}
    </div>
  );
}

export function EmptyMessage({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="status_card">
      <i className="fa-regular fa-circle-question status_icon_large" aria-hidden="true" />
      <p className="status_message_text">{message}</p>
      {hint && <p className="status_message_hint">{hint}</p>}
    </div>
  );
}
