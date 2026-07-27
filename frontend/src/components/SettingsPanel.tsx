import { useState } from 'react';

import { Modal } from '@/components/Modal';
import { STORAGE_KEYS } from '@/player/constants';
import { removeJson } from '@/utils/storage';
import {
  DEFAULT_THEME,
  getStoredTheme,
  setStoredTheme,
  type ThemeMode,
  type ThemeSettings,
} from '@/utils/theme';

/**
 * The sidebar's gear icon opened nothing in the original layout or the
 * first cut of this rebuild. Real theming, not a mockup: pick a primary
 * and secondary color plus light/dark mode, and every other chrome color
 * (backgrounds, panels, text) is derived from those three -- see
 * utils/theme.ts. Scoped to the app's chrome (sidebar, player/queue,
 * modals); the white Home/Search/Library panels keep their original look.
 */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [theme, setTheme] = useState<ThemeSettings>(getStoredTheme);
  const [cleared, setCleared] = useState(false);

  const update = (patch: Partial<ThemeSettings>) => {
    const next = { ...theme, ...patch };
    setTheme(next);
    setStoredTheme(next);
  };

  const handleReset = () => update(DEFAULT_THEME);

  const handleClearLocalData = () => {
    removeJson(STORAGE_KEYS.queue);
    removeJson(STORAGE_KEYS.likedSongs);
    setCleared(true);
  };

  return (
    <Modal title="Settings" onClose={onClose}>
      <section className="tuneup_settings_section">
        <h3>Theme</h3>
        <p className="tuneup_settings_hint">
          Primary and secondary colors, plus light or dark mode -- every other chrome color
          (the sidebar, the queue/player panel, this settings window) is computed from those
          three. The white Home/Search/Library pages keep their original look; this app&rsquo;s
          bigger redesign is a separate project for later.
        </p>

        <div className="tuneup_theme_mode_row">
          {(['dark', 'light'] as ThemeMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={mode === theme.mode ? 'tuneup_mode_button active' : 'tuneup_mode_button'}
              onClick={() => update({ mode })}
              aria-pressed={mode === theme.mode}
            >
              {mode === 'dark' ? 'Dark' : 'Light'}
            </button>
          ))}
        </div>

        <div className="tuneup_settings_row">
          <label className="tuneup_color_field">
            <span>Primary</span>
            <input
              type="color"
              value={theme.primary}
              onChange={(event) => update({ primary: event.target.value })}
              aria-label="Primary color"
            />
          </label>
          <label className="tuneup_color_field">
            <span>Secondary</span>
            <input
              type="color"
              value={theme.secondary}
              onChange={(event) => update({ secondary: event.target.value })}
              aria-label="Secondary color"
            />
          </label>
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
