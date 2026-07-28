/**
 * A shimmering placeholder shaped like the content that's about to load,
 * rather than a spinner in a box floating in otherwise-empty space. Used
 * while the home feed loads, in the exact positions the real content will
 * occupy, so nothing jumps around once it arrives.
 */
export function Skeleton({
  width = '100%',
  height = '16px',
  radius = '8px',
  className,
}: {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
}) {
  return (
    <span
      className={`tuneup_skeleton${className ? ` ${className}` : ''}`}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}
