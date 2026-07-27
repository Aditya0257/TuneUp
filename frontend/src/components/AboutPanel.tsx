import { Modal } from '@/components/Modal';

/**
 * The sidebar's user icon was decorative in the original layout -- there's
 * no user-account system here, so rather than fake one, it opens this
 * instead: what this app actually is, for a visitor who lands on it cold.
 */
export function AboutPanel({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="About TuneUp" onClose={onClose}>
      <p>
        TuneUp is a rebuild of the author&rsquo;s first web project -- originally a Flask +
        Jinja + vanilla JS app that scraped YouTube for playable audio, which only ever
        worked on the author&rsquo;s own laptop.
      </p>
      <p>
        This version plays through the official YouTube IFrame Player API instead of a
        scraped stream, so it can actually be hosted. The layout, the class names, the
        whole visual identity are carried over from that first version on purpose.
      </p>

      <dl className="tuneup_about_stack">
        <dt>Frontend</dt>
        <dd>React 18, Vite, TypeScript</dd>
        <dt>Backend</dt>
        <dd>Flask (JSON API only)</dd>
        <dt>Music data</dt>
        <dd>ytmusicapi (unauthenticated)</dd>
        <dt>Playback</dt>
        <dd>YouTube IFrame Player API</dd>
        <dt>Storage</dt>
        <dd>MongoDB, with an in-memory fallback</dd>
      </dl>

      <p>
        <a href="https://github.com/Aditya0257/TuneUp" target="_blank" rel="noopener noreferrer">
          Source on GitHub
        </a>
      </p>
    </Modal>
  );
}
