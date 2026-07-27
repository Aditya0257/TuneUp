import { readJson, writeJson } from '@/utils/storage';

/**
 * The one piece of real, functional theming this app has right now: an
 * accent color, applied through a CSS custom property that overrides.scss
 * reads for the bits of UI added on top of the original (active nav state,
 * focus rings, the dev drawer's flow links). The original's own ported
 * stylesheets are untouched -- this only reaches the new layer.
 */
const ACCENT_STORAGE_KEY = 'tuneupAccentColor';
export const DEFAULT_ACCENT = '#2c55ea';

export function getStoredAccent(): string {
  return readJson<string>(ACCENT_STORAGE_KEY, DEFAULT_ACCENT);
}

export function applyAccent(color: string): void {
  document.documentElement.style.setProperty('--tuneup-accent', color);
}

export function setStoredAccent(color: string): void {
  writeJson(ACCENT_STORAGE_KEY, color);
  applyAccent(color);
}

/** Called once at startup so the saved accent applies before first paint of any UI that reads it. */
export function initAccent(): void {
  applyAccent(getStoredAccent());
}
