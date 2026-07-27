/**
 * Loading / empty / error feedback. The original had none of these -- an
 * XHR that returned anything other than 200 left the page silently blank.
 */
export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="status_message" role="status">
      <span className="status_spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="status_message status_error" role="alert">
      <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="status_message">
      <i className="fa-regular fa-circle-question" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
