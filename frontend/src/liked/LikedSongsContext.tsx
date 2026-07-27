/**
 * Liked songs -- one source of truth.
 *
 * The original spread this across four files and three storage locations:
 *
 *   - updateLikedSongs.js kept a `likedSongs` array in localStorage and also
 *     tracked a module-level `isLiked` boolean that was shared by every song on
 *     the page, so liking song B after song A would read A's state.
 *   - sendLikedSongsToServer.js POSTed the whole localStorage array to /music.
 *   - app.py stashed that array in the Flask *session*, then on the next GET
 *     compared it against MongoDB and wiped + reinserted the collection if they
 *     differed -- meaning a stale browser tab could delete your liked songs.
 *   - setInitialLikeIcon.js then re-derived every heart icon from localStorage
 *     by parsing DOM element ids.
 *
 * Now: the server is authoritative, localStorage is a render-fast cache, and
 * the toggle is optimistic with rollback on failure.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { api } from '@/api/client';
import { STORAGE_KEYS } from '@/player/constants';
import type { LikedSong, Song } from '@/types';
import { readArray, writeJson } from '@/utils/storage';

interface LikedSongsApi {
  likedSongs: LikedSong[];
  likedIds: Set<string>;
  loading: boolean;
  error: string | null;
  isLiked: (videoId: string) => boolean;
  toggleLike: (song: Song | LikedSong) => Promise<void>;
}

const LikedSongsContext = createContext<LikedSongsApi | null>(null);

function toLikedSong(song: Song | LikedSong): LikedSong {
  return {
    videoId: song.videoId,
    title: song.title,
    artist: song.artist,
    thumbnail: song.thumbnail ?? null,
  };
}

export function LikedSongsProvider({ children }: { children: ReactNode }) {
  // Seed from cache so hearts render filled on first paint, no flicker.
  const [likedSongs, setLikedSongs] = useState<LikedSong[]>(() =>
    readArray<LikedSong>(STORAGE_KEYS.likedSongs).filter((song) => Boolean(song?.videoId)),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(new Set<string>());

  // Cache mirrors state on every change.
  useEffect(() => {
    writeJson(STORAGE_KEYS.likedSongs, likedSongs);
  }, [likedSongs]);

  // Reconcile with the server once on mount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const serverSongs = await api.getLikedSongs();
        if (cancelled) return;

        const cached = readArray<LikedSong>(STORAGE_KEYS.likedSongs).filter((song) =>
          Boolean(song?.videoId),
        );

        // First run against a fresh database: adopt whatever this browser had.
        // Only ever an upload, never a delete -- the original could wipe the
        // collection from a stale tab.
        if (serverSongs.length === 0 && cached.length > 0) {
          const merged = await api.syncLikedSongs(cached);
          if (!cancelled) setLikedSongs(merged);
        } else {
          setLikedSongs(serverSongs);
        }
      } catch (cause) {
        if (!cancelled) {
          // Offline is fine -- keep showing the cache.
          setError((cause as Error).message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const likedIds = useMemo(
    () => new Set(likedSongs.map((song) => song.videoId)),
    [likedSongs],
  );

  const isLiked = useCallback((videoId: string) => likedIds.has(videoId), [likedIds]);

  const toggleLike = useCallback(
    async (input: Song | LikedSong) => {
      const song = toLikedSong(input);
      if (!song.videoId || inFlight.current.has(song.videoId)) return;

      inFlight.current.add(song.videoId);
      const previous = likedSongs;
      const wasLiked = previous.some((item) => item.videoId === song.videoId);

      // Optimistic: the heart flips immediately.
      setLikedSongs(
        wasLiked
          ? previous.filter((item) => item.videoId !== song.videoId)
          : [song, ...previous],
      );
      setError(null);

      try {
        const authoritative = wasLiked
          ? await api.unlikeSong(song.videoId)
          : await api.likeSong(song);
        setLikedSongs(authoritative);
      } catch (cause) {
        setLikedSongs(previous); // roll back
        setError((cause as Error).message);
      } finally {
        inFlight.current.delete(song.videoId);
      }
    },
    [likedSongs],
  );

  const value = useMemo<LikedSongsApi>(
    () => ({ likedSongs, likedIds, loading, error, isLiked, toggleLike }),
    [likedSongs, likedIds, loading, error, isLiked, toggleLike],
  );

  return (
    <LikedSongsContext.Provider value={value}>{children}</LikedSongsContext.Provider>
  );
}

export function useLikedSongs(): LikedSongsApi {
  const context = useContext(LikedSongsContext);
  if (!context) {
    throw new Error('useLikedSongs must be used inside <LikedSongsProvider>.');
  }
  return context;
}
