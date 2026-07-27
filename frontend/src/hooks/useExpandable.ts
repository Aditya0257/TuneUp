import { useMemo, useState } from 'react';

/**
 * Backs every "See all" link in the app. The original templates had these
 * hardcoded as static `<u>See all</u>` text with nothing behind them --
 * every section already rendered its full fetched result set, so there was
 * never anything left to reveal.
 *
 * This caps the default view and reveals the rest (already in hand, no
 * extra fetch) on click, so "See all" does something real.
 */
export function useExpandable<T>(items: T[], defaultCount: number) {
  const [expanded, setExpanded] = useState(false);

  const visible = useMemo(
    () => (expanded ? items : items.slice(0, defaultCount)),
    [items, expanded, defaultCount],
  );

  return {
    visible,
    isExpandable: items.length > defaultCount,
    expanded,
    toggle: () => setExpanded((value) => !value),
  };
}
