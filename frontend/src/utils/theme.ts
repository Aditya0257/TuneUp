import { readJson, writeJson } from '@/utils/storage';

/**
 * The app's real theming system: pick a primary and a secondary color plus
 * a light/dark mode, and every other chrome color (backgrounds, panels,
 * surfaces, text) is derived from those three inputs -- not five
 * independent raw swatches. Scoped mostly to the app's *chrome*: the
 * sidebar frame, the queue/player panel, and the modals this rebuild added.
 *
 * pageBg is the one thing that reaches past chrome into the white content
 * panels (Home/Search/Library/History/Playlists) -- a single background
 * color for all of them, with the main heading/paragraph text recolored
 * for contrast against whatever's picked (dark text on a light page,
 * white text on a dark one). It does NOT try to recolor every hardcoded
 * accent in the ported stylesheets (link colors, category pills, etc.) --
 * that would mean rewriting those files, not overriding them.
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeSettings {
  primary: string;
  secondary: string;
  mode: ThemeMode;
  pageBg: string;
}

const THEME_STORAGE_KEY = 'tuneupTheme';

export const DEFAULT_THEME: ThemeSettings = {
  primary: '#393357', // the original body/chrome purple
  secondary: '#2c55ea', // the original's one hardcoded accent (rgb(44, 85, 234))
  mode: 'dark', // the original was only ever designed dark-chrome
  pageBg: '#ffffff', // the original's page panels were always white
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

/** WCAG-style relative luminance, to decide whether a background reads as light or dark. */
function relativeLuminance(hex: string): number {
  const normalized = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(normalized.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export interface PageTokens {
  bg: string;
  text: string;
  textDim: string;
}

export function computePageTokens(pageBg: string): PageTokens {
  const isLight = relativeLuminance(pageBg) > 0.5;
  return {
    bg: pageBg,
    text: isLight ? '#26262b' : '#ffffff',
    textDim: isLight ? '#6b6b72' : '#c4c4c5',
  };
}

function applyTokens(tokens: ChromeTokens, page: PageTokens): void {
  const root = document.documentElement.style;
  root.setProperty('--tuneup-chrome-bg', tokens.bg);
  root.setProperty('--tuneup-chrome-panel', tokens.panel);
  root.setProperty('--tuneup-chrome-surface', tokens.surface);
  root.setProperty('--tuneup-chrome-text', tokens.text);
  root.setProperty('--tuneup-chrome-text-dim', tokens.textDim);
  root.setProperty('--tuneup-accent', tokens.accent);
  root.setProperty('--tuneup-page-bg', page.bg);
  root.setProperty('--tuneup-page-text', page.text);
  root.setProperty('--tuneup-page-text-dim', page.textDim);
}

export function getStoredTheme(): ThemeSettings {
  // Merged with defaults, not trusted outright: anyone who saved a theme
  // before `pageBg` (or any future field) existed has a stored object
  // missing it. Reading that key back as `undefined` and handing it to
  // computePageTokens() crashed before React ever mounted -- a blank page
  // with no error overlay, since the crash happened at module-eval time
  // in main.tsx, before the render even starts.
  return { ...DEFAULT_THEME, ...readJson<Partial<ThemeSettings>>(THEME_STORAGE_KEY, {}) };
}

export function applyTheme(theme: ThemeSettings): void {
  applyTokens(computeChromeTokens(theme), computePageTokens(theme.pageBg));
}

export function setStoredTheme(theme: ThemeSettings): void {
  writeJson(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

/** Called once at startup so the saved theme applies before first paint. */
export function initTheme(): void {
  applyTheme(getStoredTheme());
}
