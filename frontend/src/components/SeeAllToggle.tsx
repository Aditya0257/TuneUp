/**
 * The original templates had a static `<u>See all</u>` in every section
 * heading, wired to nothing -- every section already rendered its whole
 * fetched result set, so there was never more to show.
 *
 * Paired with useExpandable: renders nothing when a section doesn't have
 * more items than its default preview count (nothing honest to reveal),
 * otherwise a real, keyboard-accessible toggle.
 */
interface SeeAllToggleProps {
  isExpandable: boolean;
  expanded: boolean;
  onToggle: () => void;
}

export function SeeAllToggle({ isExpandable, expanded, onToggle }: SeeAllToggleProps) {
  if (!isExpandable) return null;

  return (
    <p>
      <button type="button" className="see_all_button" onClick={onToggle}>
        <u>{expanded ? 'Show less' : 'See all'}</u>
      </button>
    </p>
  );
}
