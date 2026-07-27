import { TITLE_MAX_LENGTH } from '@/player/constants';

/** Port of the original `setSongNameWithEllipsis`. */
export function truncate(text: string, maxLength = TITLE_MAX_LENGTH): string {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

/** Seconds to `m:ss`. The original rounded, which could render ":60". */
export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const seconds = Math.floor(totalSeconds);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

/** Two-digit track numbers, as the Jinja `{% if loop.index <= 9 %}` did. */
export function trackNumber(index: number): string {
  return index.toString().padStart(2, '0');
}

const FALLBACK_THUMBNAIL = '/assets/images/song_thumbnail_img.jpeg';

export function thumbnailOrFallback(url: string | null | undefined): string {
  return url || FALLBACK_THUMBNAIL;
}
