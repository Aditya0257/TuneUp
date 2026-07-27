import { useState } from 'react';

import { Modal } from '@/components/Modal';
import { STORAGE_KEYS } from '@/player/constants';
import { DEFAULT_ACCENT, getStoredAccent, setStoredAccent } from '@/utils/theme';
import { removeJson } from '@/utils/storage';

/**
 * The sidebar's gear icon opened nothing in the original layout or the
 * first cut of this rebuild. This is deliberately small: one real,
 * functional setting (accent color) plus a genuine data-management action,
 * not a mockup of a settings screen with switches that don't do anything.
 */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [accent, setAccent] = useState(getStoredAccent);
  const [cleared, setCleared] = useState(false);

  const handleAccentChange = (color: string) => {
    setAccent(color);
    setStoredAccent(color);
  };

  const handleReset = () => {
    handleAccentChange(DEFAULT_ACCENT);
  };

  const handleClearLocalData = () => {
    removeJson(STORAGE_KEYS.queue);
    removeJson(STORAGE_KEYS.likedSongs);
    setCleared(true);
  };

  return (
    <Modal title="Settings" onClose={onClose}>
      <section className="tuneup_settings_section">
        <h3>Accent color</h3>
        <p className="tuneup_settings_hint">
          Colors the sidebar&rsquo;s active page indicator, focus outlines, and a few other
          new touches added on top of the original design.
        </p>
        <div className="tuneup_settings_row">
          <input
            type="color"
            value={accent}
            onChange={(event) => handleAccentChange(event.target.value)}
            aria-label="Accent color"
          />
          <button type="button" onClick={handleReset}>
            Reset to default
          </button>
        </div>
      </section>

      <section className="tuneup_settings_section">
        <h3>Local data</h3>
        <p className="tuneup_settings_hint">
          Your queue and a locally-cached copy of your liked songs live in this browser&rsquo;s
          storage. Liked songs themselves stay on the server -- this only clears the local
          cache and queue, not your library.
        </p>
        <button type="button" onClick={handleClearLocalData} disabled={cleared}>
          {cleared ? 'Cleared -- refresh to see the effect' : 'Clear local queue & cache'}
        </button>
      </section>
    </Modal>
  );
}
