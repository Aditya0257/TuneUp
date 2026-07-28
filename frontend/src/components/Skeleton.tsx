import type { CSSProperties } from 'react';

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
  style,
}: {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
  /** Extra layout properties (e.g. margin) needed to match a real element's
   * box model -- most callers don't need this, only ones standing in for
   * an image that isn't a plain 100%-of-its-box fill. */
  style?: CSSProperties;
}) {
  return (
    <span
      className={`tuneup_skeleton${className ? ` ${className}` : ''}`}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}
