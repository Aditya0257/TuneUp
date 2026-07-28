/**
 * User-created playlists -- a sibling to LikedSongsContext, not a merge
 * into it.
 *
 * Liked Songs is a single global "is this liked, yes/no" toggle; playlists
 * are "which of my N playlists contain this song", a fundamentally
 * different shape (a list of collections, each with its own song list,
 * plus a membership lookup) that would bloat LikedSongsContext's API and
 * re-render surface if crammed into the same context. They stay two
 * independent systems: a song can be liked and independently sit in zero
 * or more playlists.
 *
 * Same optimistic + localStorage-cache pattern as LikedSongsContext, but
 * simpler -- there's no pre-existing local-only data to migrate (playlists
 * are a brand new feature), so there's no "server empty, cache has data"
 * merge branch to handle.
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
import type { LikedSong, Song, UserPlaylist } from '@/types';
import { readArray, writeJson } from '@/utils/storage';

interface PlaylistsApi {
  playlists: UserPlaylist[];
  loading: boolean;
  error: string | null;
  /** Which playlist ids currently contain this song -- for the TrackDropdown checklist. */
  playlistsContaining: (videoId: string) => Set<string>;
  createPlaylist: (name: string) => Promise<UserPlaylist>;
  renamePlaylist: (id: string, name: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addSongToPlaylist: (id: string, song: Song | LikedSong) => Promise<void>;
  removeSongFromPlaylist: (id: string, videoId: string) => Promise<void>;
}

const PlaylistsContext = createContext<PlaylistsApi | null>(null);

function toPlaylistSong(song: Song | LikedSong): LikedSong {
  return {
    videoId: song.videoId,
    title: song.title,
    artist: song.artist,
    thumbnail: song.thumbnail ?? null,
    duration: song.duration ?? null,
  };
}

export function PlaylistsProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<UserPlaylist[]>(() =>
    readArray<UserPlaylist>(STORAGE_KEYS.playlists).filter((playlist) => Boolean(playlist?.id)),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Keyed by an operation id (playlistId, or `${playlistId}:${videoId}` for
  // song add/remove) so two different mutations never block each other.
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    writeJson(STORAGE_KEYS.playlists, playlists);
  }, [playlists]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const serverPlaylists = await api.getPlaylists();
        if (!cancelled) setPlaylists(serverPlaylists);
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

  const membership = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const playlist of playlists) {
      for (const song of playlist.songs) {
        const set = map.get(song.videoId) ?? new Set<string>();
        set.add(playlist.id);
        map.set(song.videoId, set);
      }
    }
    return map;
  }, [playlists]);

  const playlistsContaining = useCallback(
    (videoId: string) => membership.get(videoId) ?? new Set<string>(),
    [membership],
  );

  const createPlaylist = useCallback(async (name: string) => {
    const created = await api.createPlaylist(name);
    setPlaylists((current) => [created, ...current]);
    return created;
  }, []);

  const renamePlaylist = useCallback(async (id: string, name: string) => {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);

    const previous = playlists;
    setPlaylists((current) => current.map((p) => (p.id === id ? { ...p, name } : p)));
    setError(null);

    try {
      const updated = await api.renamePlaylist(id, name);
      setPlaylists((current) => current.map((p) => (p.id === id ? updated : p)));
    } catch (cause) {
      setPlaylists(previous);
      setError((cause as Error).message);
    } finally {
      inFlight.current.delete(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlists]);

  const deletePlaylist = useCallback(async (id: string) => {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);

    const previous = playlists;
    setPlaylists((current) => current.filter((p) => p.id !== id));
    setError(null);

    try {
      await api.deletePlaylist(id);
    } catch (cause) {
      setPlaylists(previous); // roll back
      setError((cause as Error).message);
    } finally {
      inFlight.current.delete(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlists]);

  const addSongToPlaylist = useCallback(
    async (id: string, input: Song | LikedSong) => {
      const song = toPlaylistSong(input);
      const opKey = `${id}:${song.videoId}`;
      if (!song.videoId || inFlight.current.has(opKey)) return;
      inFlight.current.add(opKey);

      const previous = playlists;
      setPlaylists((current) =>
        current.map((p) =>
          p.id === id && !p.songs.some((s) => s.videoId === song.videoId)
            ? { ...p, songs: [...p.songs, song] }
            : p,
        ),
      );
      setError(null);

      try {
        const updated = await api.addSongToPlaylist(id, song);
        setPlaylists((current) => current.map((p) => (p.id === id ? updated : p)));
      } catch (cause) {
        setPlaylists(previous);
        setError((cause as Error).message);
      } finally {
        inFlight.current.delete(opKey);
      }
    },
    [playlists],
  );

  const removeSongFromPlaylist = useCallback(
    async (id: string, videoId: string) => {
      const opKey = `${id}:${videoId}`;
      if (inFlight.current.has(opKey)) return;
      inFlight.current.add(opKey);

      const previous = playlists;
      setPlaylists((current) =>
        current.map((p) =>
          p.id === id ? { ...p, songs: p.songs.filter((s) => s.videoId !== videoId) } : p,
        ),
      );
      setError(null);

      try {
        const updated = await api.removeSongFromPlaylist(id, videoId);
        setPlaylists((current) => current.map((p) => (p.id === id ? updated : p)));
      } catch (cause) {
        setPlaylists(previous);
        setError((cause as Error).message);
      } finally {
        inFlight.current.delete(opKey);
      }
    },
    [playlists],
  );

  const value = useMemo<PlaylistsApi>(
    () => ({
      playlists,
      loading,
      error,
      playlistsContaining,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
    }),
    [
      playlists,
      loading,
      error,
      playlistsContaining,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
    ],
  );

  return <PlaylistsContext.Provider value={value}>{children}</PlaylistsContext.Provider>;
}

export function usePlaylists(): PlaylistsApi {
  const context = useContext(PlaylistsContext);
  if (!context) {
    throw new Error('usePlaylists must be used inside <PlaylistsProvider>.');
  }
  return context;
}
