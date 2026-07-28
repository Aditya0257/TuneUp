/** Numeric player states from the YouTube IFrame API. */
export const PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

/**
 * Error codes that mean "this specific video cannot be played here", as
 * opposed to a transient failure. When we see one of these we skip the track
 * instead of leaving the player stuck on it.
 *
 *   2   malformed video id
 *   5   HTML5 player error
 *   100 video removed or private
 *   101 owner disallows embedded playback
 *   150 same as 101
 *
 * 101/150 is the real-world cost of using the official embed: some labels
 * disable off-site playback. Auto-skip keeps the queue moving.
 */
export const UNPLAYABLE_ERROR_CODES = new Set([2, 5, 100, 101, 150]);

/** Behavioural limits carried over from the original musicPlayer.js. */
export const MAX_QUEUE_SIZE = 25;
export const MAX_HISTORY_SIZE = 10;
export const REFILL_THRESHOLD = 4;
export const REFILL_BATCH_SIZE = 15;
export const PREFETCH_INTERVAL_MS = 5 * 60 * 1000;
export const PREFETCH_COUNT = 7;
export const TITLE_MAX_LENGTH = 30;

/** localStorage keys -- identical to the original, so existing data carries over. */
export const STORAGE_KEYS = {
  queue: 'songsQueue',
  likedSongs: 'likedSongs',
  playlists: 'userPlaylists',
} as const;
