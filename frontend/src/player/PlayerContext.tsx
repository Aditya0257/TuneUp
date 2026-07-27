/**
 * The player engine -- a port of the original 707-line musicPlayer.js.
 *
 * Two structural changes from the original:
 *
 * 1. Playback source. The original set `<audio src="...">` to a scraped
 *    googlevideo.com stream URL. This drives a hidden YouTube IFrame player
 *    instead, so the only thing it needs is a videoId.
 *
 * 2. Queue model. The original kept the *currently playing* song at
 *    `currentQueue[0]` and inserted new songs with `splice(1, 0, song)`, then
 *    rendered `currentQueue.slice(1)` as "up next". That off-by-one shows up in
 *    almost every function there. `currentTrack` is now separate from `queue`,
 *    so `queue` means exactly "what plays next" with no slicing.
 *
 * Behaviour that is deliberately preserved: max 25 queued, max 10 in history,
 * refill under 4 remaining, periodic background prefetch, Fisher-Yates shuffle,
 * random eviction past index 2 on overflow, and the same localStorage keys.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import { api } from '@/api/client';
import {
  MAX_HISTORY_SIZE,
  MAX_QUEUE_SIZE,
  PLAYER_STATE,
  PREFETCH_COUNT,
  PREFETCH_INTERVAL_MS,
  REFILL_BATCH_SIZE,
  REFILL_THRESHOLD,
  STORAGE_KEYS,
  UNPLAYABLE_ERROR_CODES,
} from '@/player/constants';
import { loadYouTubeApi } from '@/player/youtubeApi';
import type { Song } from '@/types';
import { readArray, writeJson } from '@/utils/storage';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface State {
  currentTrack: Song | null;
  queue: Song[];
  history: Song[];
  isPlaying: boolean;
  isLooping: boolean;
  isShuffled: boolean;
  currentTime: number;
  duration: number;
  isReady: boolean;
  isLoadingQueue: boolean;
  error: string | null;
}

const initialState: State = {
  currentTrack: null,
  queue: [],
  history: [],
  isPlaying: false,
  isLooping: false,
  isShuffled: false,
  currentTime: 0,
  duration: 0,
  isReady: false,
  isLoadingQueue: false,
  error: null,
};

type Action =
  | { type: 'RESTORE'; queue: Song[] }
  | { type: 'PLAY_TRACK'; track: Song }
  | { type: 'ADVANCE' }
  | { type: 'REWIND' }
  | { type: 'ENQUEUE'; tracks: Song[]; position: 'next' | 'end' }
  | { type: 'REMOVE_AT'; index: number }
  | { type: 'CLEAR_QUEUE' }
  | { type: 'SHUFFLE' }
  | { type: 'TOGGLE_LOOP' }
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'SET_PROGRESS'; currentTime: number; duration: number }
  | { type: 'SET_READY' }
  | { type: 'SET_LOADING_QUEUE'; isLoadingQueue: boolean }
  | { type: 'SET_ERROR'; error: string | null };

/** Fisher-Yates, same algorithm as the original `shuffleArray`. */
function shuffled<T>(input: T[]): T[] {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function withoutTrack(queue: Song[], videoId: string): Song[] {
  return queue.filter((track) => track.videoId !== videoId);
}

/**
 * Trim an oversized queue. Mirrors the original `removeRandomFromQueue`:
 * evict at random rather than from the tail, but never touch the next couple
 * of tracks, since the user can see those in the "Next Composition" panel.
 */
function capQueue(queue: Song[]): Song[] {
  if (queue.length <= MAX_QUEUE_SIZE) return queue;
  const next = [...queue];
  while (next.length > MAX_QUEUE_SIZE) {
    const index =
      next.length > 2 ? Math.floor(Math.random() * (next.length - 2)) + 2 : next.length - 1;
    next.splice(index, 1);
  }
  return next;
}

function capHistory(history: Song[]): Song[] {
  return history.length > MAX_HISTORY_SIZE ? history.slice(-MAX_HISTORY_SIZE) : history;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'RESTORE':
      return { ...state, queue: capQueue(action.queue) };

    case 'PLAY_TRACK': {
      // Explicit user pick: play now, and don't leave a duplicate queued.
      const history = state.currentTrack
        ? capHistory([...state.history, state.currentTrack])
        : state.history;
      return {
        ...state,
        currentTrack: action.track,
        queue: withoutTrack(state.queue, action.track.videoId),
        history,
        currentTime: 0,
        duration: 0,
        error: null,
      };
    }

    case 'ADVANCE': {
      const [next, ...rest] = state.queue;
      if (!next) return state;
      const history = state.currentTrack
        ? capHistory([...state.history, state.currentTrack])
        : state.history;
      return {
        ...state,
        currentTrack: next,
        queue: rest,
        history,
        currentTime: 0,
        duration: 0,
        error: null,
      };
    }

    case 'REWIND': {
      const previous = state.history.at(-1);
      if (!previous) return state;
      return {
        ...state,
        currentTrack: previous,
        history: state.history.slice(0, -1),
        queue: state.currentTrack
          ? capQueue([state.currentTrack, ...state.queue])
          : state.queue,
        currentTime: 0,
        duration: 0,
        error: null,
      };
    }

    case 'ENQUEUE': {
      const incoming = action.tracks.filter(
        (track) =>
          track.videoId !== state.currentTrack?.videoId &&
          !state.queue.some((queued) => queued.videoId === track.videoId),
      );
      if (incoming.length === 0) return state;
      const queue =
        action.position === 'next'
          ? [...incoming, ...state.queue]
          : [...state.queue, ...incoming];
      return { ...state, queue: capQueue(queue) };
    }

    case 'REMOVE_AT':
      return { ...state, queue: state.queue.filter((_, i) => i !== action.index) };

    case 'CLEAR_QUEUE':
      return { ...state, queue: [] };

    case 'SHUFFLE':
      return { ...state, isShuffled: !state.isShuffled, queue: shuffled(state.queue) };

    case 'TOGGLE_LOOP':
      return { ...state, isLooping: !state.isLooping };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.isPlaying };

    case 'SET_PROGRESS':
      return { ...state, currentTime: action.currentTime, duration: action.duration };

    case 'SET_READY':
      return { ...state, isReady: true };

    case 'SET_LOADING_QUEUE':
      return { ...state, isLoadingQueue: action.isLoadingQueue };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface PlayerApi extends State {
  playTrack: (track: Song) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  beginSeek: () => void;
  endSeek: () => void;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  addToQueue: (track: Song) => void;
  playNext: (track: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
}

const PlayerContext = createContext<PlayerApi | null>(null);

const PLAYER_ELEMENT_ID = 'tuneup-yt-player';
const MAX_CONSECUTIVE_FAILURES = 5;

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const playerRef = useRef<YT.Player | null>(null);
  const loadedVideoIdRef = useRef<string | null>(null);
  const isSeekingRef = useRef(false);
  const isRefillingRef = useRef(false);
  const failureCountRef = useRef(0);

  // Latest state for use inside imperative YT callbacks, which capture the
  // closure from the render that created the player.
  const stateRef = useRef(state);
  stateRef.current = state;

  // -- restore persisted queue ------------------------------------------
  useEffect(() => {
    const stored = readArray<Song>(STORAGE_KEYS.queue).filter(
      (track): track is Song => Boolean(track?.videoId && track?.title),
    );
    if (stored.length > 0) {
      dispatch({ type: 'RESTORE', queue: stored });
    }
  }, []);

  // -- persist queue ----------------------------------------------------
  useEffect(() => {
    writeJson(STORAGE_KEYS.queue, state.queue);
  }, [state.queue]);

  // -- create the hidden player ----------------------------------------
  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi()
      .then((YTApi) => {
        if (cancelled) return;
        const host = document.getElementById(PLAYER_ELEMENT_ID);
        if (!host) return;

        playerRef.current = new YTApi.Player(host, {
          height: '0',
          width: '0',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => dispatch({ type: 'SET_READY' }),
            onStateChange: handleStateChange,
            onError: handleError,
          },
        });
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          dispatch({ type: 'SET_ERROR', error: String((cause as Error).message ?? cause) });
        }
      });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // Player may already be gone during hot reload.
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStateChange = useCallback((event: YT.OnStateChangeEvent) => {
    const code = event.data;

    if (code === PLAYER_STATE.PLAYING) {
      failureCountRef.current = 0;
      dispatch({ type: 'SET_PLAYING', isPlaying: true });
      dispatch({ type: 'SET_ERROR', error: null });
      return;
    }

    if (code === PLAYER_STATE.PAUSED) {
      dispatch({ type: 'SET_PLAYING', isPlaying: false });
      return;
    }

    if (code === PLAYER_STATE.ENDED) {
      // The original checked `song.currentTime === song.duration` on every
      // timeupdate tick to detect the end, which was flaky. The IFrame API
      // gives us a real ENDED event.
      if (stateRef.current.isLooping) {
        playerRef.current?.seekTo(0, true);
        playerRef.current?.playVideo();
      } else {
        dispatch({ type: 'ADVANCE' });
      }
    }
  }, []);

  const handleError = useCallback((event: YT.OnErrorEvent) => {
    if (!UNPLAYABLE_ERROR_CODES.has(event.data)) return;

    failureCountRef.current += 1;
    const title = stateRef.current.currentTrack?.title ?? 'This track';

    if (failureCountRef.current >= MAX_CONSECUTIVE_FAILURES) {
      dispatch({
        type: 'SET_ERROR',
        error: 'Several tracks in a row could not be played. Try a different search.',
      });
      dispatch({ type: 'SET_PLAYING', isPlaying: false });
      return;
    }

    dispatch({
      type: 'SET_ERROR',
      error: `${title} can't be played here (the owner disabled embedding). Skipping.`,
    });
    dispatch({ type: 'ADVANCE' });
  }, []);

  // -- load the current track into the player ---------------------------
  useEffect(() => {
    const player = playerRef.current;
    const track = state.currentTrack;
    if (!player || !state.isReady || !track) return;
    if (loadedVideoIdRef.current === track.videoId) return;

    loadedVideoIdRef.current = track.videoId;
    player.loadVideoById(track.videoId);

    // Fire and forget: play history is a nice-to-have, not worth blocking on.
    void api
      .recordPlay({
        videoId: track.videoId,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
      })
      .catch(() => undefined);
  }, [state.currentTrack, state.isReady]);

  // -- progress polling --------------------------------------------------
  useEffect(() => {
    if (!state.isPlaying) return;

    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || isSeekingRef.current) return;
      try {
        dispatch({
          type: 'SET_PROGRESS',
          currentTime: player.getCurrentTime() ?? 0,
          duration: player.getDuration() ?? 0,
        });
      } catch {
        // Player torn down mid-tick.
      }
    }, 250);

    return () => window.clearInterval(id);
  }, [state.isPlaying]);

  // -- keep the queue topped up ------------------------------------------
  const refillQueue = useCallback(async (count: number) => {
    if (isRefillingRef.current) return;
    isRefillingRef.current = true;
    dispatch({ type: 'SET_LOADING_QUEUE', isLoadingQueue: true });
    try {
      const songs = await api.getRandomSongs(count);
      if (songs.length > 0) {
        dispatch({ type: 'ENQUEUE', tracks: songs, position: 'end' });
      }
    } catch {
      // Offline or API down; the queue simply stays short.
    } finally {
      isRefillingRef.current = false;
      dispatch({ type: 'SET_LOADING_QUEUE', isLoadingQueue: false });
    }
  }, []);

  useEffect(() => {
    if (state.queue.length < REFILL_THRESHOLD) {
      void refillQueue(REFILL_BATCH_SIZE);
    }
  }, [state.queue.length, refillQueue]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (stateRef.current.queue.length < MAX_QUEUE_SIZE) {
        void refillQueue(PREFETCH_COUNT);
      }
    }, PREFETCH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refillQueue]);

  // -- actions -----------------------------------------------------------
  const playTrack = useCallback((track: Song) => {
    failureCountRef.current = 0;
    dispatch({ type: 'PLAY_TRACK', track });
  }, []);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    // Nothing loaded yet: start from the queue, as the original did when the
    // play button was pressed on a cold page.
    if (!stateRef.current.currentTrack) {
      dispatch({ type: 'ADVANCE' });
      return;
    }

    if (stateRef.current.isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }, []);

  const next = useCallback(() => {
    failureCountRef.current = 0;
    dispatch({ type: 'ADVANCE' });
  }, []);

  const previous = useCallback(() => dispatch({ type: 'REWIND' }), []);

  const seek = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
    dispatch({
      type: 'SET_PROGRESS',
      currentTime: seconds,
      duration: stateRef.current.duration,
    });
  }, []);

  // The original detached its timeupdate listener on mousedown and reattached
  // on mouseup so polling could not fight the drag. Same idea, via a ref.
  const beginSeek = useCallback(() => {
    isSeekingRef.current = true;
  }, []);
  const endSeek = useCallback(() => {
    isSeekingRef.current = false;
  }, []);

  const toggleLoop = useCallback(() => dispatch({ type: 'TOGGLE_LOOP' }), []);
  const toggleShuffle = useCallback(() => dispatch({ type: 'SHUFFLE' }), []);

  const addToQueue = useCallback((track: Song) => {
    dispatch({ type: 'ENQUEUE', tracks: [track], position: 'end' });
  }, []);

  const playNext = useCallback((track: Song) => {
    dispatch({ type: 'ENQUEUE', tracks: [track], position: 'next' });
  }, []);

  const removeFromQueue = useCallback(
    (index: number) => dispatch({ type: 'REMOVE_AT', index }),
    [],
  );

  const clearQueue = useCallback(() => dispatch({ type: 'CLEAR_QUEUE' }), []);

  const value = useMemo<PlayerApi>(
    () => ({
      ...state,
      playTrack,
      togglePlay,
      next,
      previous,
      seek,
      beginSeek,
      endSeek,
      toggleLoop,
      toggleShuffle,
      addToQueue,
      playNext,
      removeFromQueue,
      clearQueue,
    }),
    [
      state,
      playTrack,
      togglePlay,
      next,
      previous,
      seek,
      beginSeek,
      endSeek,
      toggleLoop,
      toggleShuffle,
      addToQueue,
      playNext,
      removeFromQueue,
      clearQueue,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/*
        The audio source. Kept 1x1 and visually hidden rather than
        display:none, because some browsers refuse to start playback in a
        fully undisplayed iframe.
      */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          width: 1,
          height: 1,
          left: -9999,
          top: -9999,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div id={PLAYER_ELEMENT_ID} />
      </div>
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerApi {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used inside <PlayerProvider>.');
  }
  return context;
}
