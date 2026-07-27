/** A tiny "?" that reveals a one-sentence explanation on hover/focus. */
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="devtip" tabIndex={0} role="note" aria-label={text}>
      ?<span className="devtip_bubble">{text}</span>
    </span>
  );
}
