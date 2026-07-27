import { readJson, writeJson } from '@/utils/storage';

/**
 * The app's real theming system: pick a primary and a secondary color plus
 * a light/dark mode, and every other chrome color (backgrounds, panels,
 * surfaces, text) is derived from those three inputs -- not five
 * independent raw swatches. Scoped deliberately to the app's *chrome*: the
 * sidebar frame, the queue/player panel, and the modals this rebuild added.
 *
 * The white content panels (Home/Search/Library) keep their original
 * hardcoded colors untouched -- their text colors are baked into the
 * ported stylesheets, so inverting the background there without also
 * rewriting every text color in those files would just make text
 * illegible. Out of scope by design, not an oversight.
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeSettings {
  primary: string;
  secondary: string;
  mode: ThemeMode;
}

const THEME_STORAGE_KEY = 'tuneupTheme';

export const DEFAULT_THEME: ThemeSettings = {
  primary: '#393357', // the original body/chrome purple
  secondary: '#2c55ea', // the original's one hardcoded accent (rgb(44, 85, 234))
  mode: 'dark', // the original was only ever designed dark-chrome
};

// -- minimal hex <-> HSL, no dependency -------------------------------------

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  return { h: h * 60, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export interface ChromeTokens {
  bg: string;
  panel: string;
  surface: string;
  text: string;
  textDim: string;
  accent: string;
}

/** The "particular way" the primary/secondary/mode combination becomes real colors. */
export function computeChromeTokens({ primary, secondary, mode }: ThemeSettings): ChromeTokens {
  const { h, s } = hexToHsl(primary);
  const cappedS = Math.min(s, 45);
  const dark = mode === 'dark';

  return {
    bg: hslToHex(h, cappedS, dark ? 21 : 95),
    panel: hslToHex(h, cappedS, dark ? 26 : 91),
    surface: hslToHex(h, Math.min(s, 55), dark ? 13 : 86),
    text: dark ? '#ffffff' : '#20202a',
    textDim: dark ? '#c4c4c5' : '#5a5a63',
    accent: secondary,
  };
}

function applyTokens(tokens: ChromeTokens): void {
  const root = document.documentElement.style;
  root.setProperty('--tuneup-chrome-bg', tokens.bg);
  root.setProperty('--tuneup-chrome-panel', tokens.panel);
  root.setProperty('--tuneup-chrome-surface', tokens.surface);
  root.setProperty('--tuneup-chrome-text', tokens.text);
  root.setProperty('--tuneup-chrome-text-dim', tokens.textDim);
  root.setProperty('--tuneup-accent', tokens.accent);
}

export function getStoredTheme(): ThemeSettings {
  return readJson<ThemeSettings>(THEME_STORAGE_KEY, DEFAULT_THEME);
}

export function applyTheme(theme: ThemeSettings): void {
  applyTokens(computeChromeTokens(theme));
}

export function setStoredTheme(theme: ThemeSettings): void {
  writeJson(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

/** Called once at startup so the saved theme applies before first paint. */
export function initTheme(): void {
  applyTheme(getStoredTheme());
}
