import type { SyntheticEvent } from 'react';

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

/**
 * ytmusicapi sometimes returns thumbnail URLs that 404 (e.g. a resolution
 * that was never generated for a given upload). `thumbnailOrFallback` only
 * catches a missing URL, not a dead one, so a broken-image icon still shows.
 *
 * This `<img onError>` handler recovers in two steps: first try YouTube's
 * near-universal `hqdefault` thumbnail for the same video, and only fall
 * back to the bundled placeholder if that also fails. A `data-` attribute
 * tracks which step we're on so a second failure doesn't loop.
 */
export function handleThumbnailError(
  event: SyntheticEvent<HTMLImageElement>,
  videoId?: string | null,
): void {
  const img = event.currentTarget;
  const stage = img.dataset.thumbFallback;

  if (!stage && videoId) {
    img.dataset.thumbFallback = 'ytimg';
    img.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    return;
  }

  if (img.dataset.thumbFallback !== 'final') {
    img.dataset.thumbFallback = 'final';
    img.src = FALLBACK_THUMBNAIL;
  }
}

/**
 * For the big art -- the now-playing artwork and the queue cards -- a
 * ytmusicapi thumbnail (often ~120-226px, sized for a list row) gets
 * stretched to fill a box several times that size and turns visibly soft.
 * Every track has a real YouTube videoId, so ask YouTube's own thumbnail
 * endpoint for `hqdefault` (480x360, present for virtually every upload)
 * instead of the small ytmusicapi crop.
 *
 * Deliberately not `maxresdefault`: YouTube serves that at a fixed low-res
 * placeholder (still HTTP 200, so onError never fires) for any video that
 * never had a high-res thumbnail generated, which would silently look worse
 * than what this is trying to fix.
 */
export function preferredArtworkSrc(
  videoId: string | null | undefined,
  thumbnail: string | null | undefined,
): string {
  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }
  return thumbnailOrFallback(thumbnail);
}

/** Pairs with preferredArtworkSrc: falls back to the ytmusicapi thumbnail, then the bundled placeholder. */
export function handleArtworkError(
  event: SyntheticEvent<HTMLImageElement>,
  thumbnail: string | null | undefined,
): void {
  const img = event.currentTarget;
  const stage = img.dataset.artFallback;

  if (!stage && thumbnail) {
    img.dataset.artFallback = 'ytmusic';
    img.src = thumbnail;
    return;
  }

  if (img.dataset.artFallback !== 'final') {
    img.dataset.artFallback = 'final';
    img.src = FALLBACK_THUMBNAIL;
  }
}
