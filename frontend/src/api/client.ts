/**
 * Typed API client.
 *
 * Replaces the scattered `XMLHttpRequest` / bare `fetch` calls in the original
 * changePage.js, searchSong.js, fetchSongsWorker.js, musicPlayer.js and
 * updateLikedSongs.js -- each of which did its own error handling (or none).
 */
import { logApiCall } from '@/dev/devLog';
import type { HomeFeed, LikedSong, Lyrics, SearchResults, Song, UserPlaylist } from '@/types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET';
  const url = `${BASE_URL}${path}`;
  const startedAt = Date.now();
  const started = performance.now();
  const requestBody = typeof init?.body === 'string' ? safeJsonParse(init.body) : null;

  const record = (fields: {
    status: number | 'error';
    ok: boolean;
    requestId?: string | null;
    cache?: 'HIT' | 'MISS' | null;
    responseBody?: unknown;
    error?: string | null;
  }) => {
    logApiCall({
      method,
      path,
      url,
      durationMs: Math.round(performance.now() - started),
      startedAt,
      requestId: fields.requestId ?? null,
      cache: fields.cache ?? null,
      requestBody,
      responseBody: fields.responseBody ?? null,
      error: fields.error ?? null,
      status: fields.status,
      ok: fields.ok,
    });
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (cause) {
    // Network-level failure: server down, DNS, CORS preflight rejected.
    const message = `Could not reach the TuneUp API. Is the Flask server running? (${String(cause)})`;
    record({ status: 'error', ok: false, error: message });
    throw new ApiError(message, 0);
  }

  const requestId = response.headers.get('X-Request-Id');
  const cache = response.headers.get('X-Cache') as 'HIT' | 'MISS' | null;

  if (response.status === 204) {
    record({ status: 204, ok: true, requestId, cache, responseBody: null });
    return undefined as T;
  }

  const text = await response.text();
  const payload: unknown = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload
        ? String((payload as { detail: unknown }).detail)
        : response.statusText;
    record({ status: response.status, ok: false, requestId, cache, responseBody: payload, error: detail });
    throw new ApiError(detail, response.status);
  }

  record({ status: response.status, ok: true, requestId, cache, responseBody: payload });
  return payload as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const api = {
  getHome: () => request<HomeFeed>('/api/home'),

  search: (query: string, limit = 30) =>
    request<SearchResults>(
      `/api/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    ),

  getSong: (videoId: string) =>
    request<Song>(`/api/songs/${encodeURIComponent(videoId)}`),

  getRandomSongs: async (count = 10): Promise<Song[]> => {
    const { songs } = await request<{ songs: Song[] }>(
      `/api/queue/random?count=${count}`,
    );
    return songs;
  },

  getLikedSongs: async (): Promise<LikedSong[]> => {
    const { songs } = await request<{ songs: LikedSong[] }>('/api/liked-songs');
    return songs;
  },

  likeSong: async (song: LikedSong): Promise<LikedSong[]> => {
    const { songs } = await request<{ songs: LikedSong[] }>('/api/liked-songs', {
      method: 'POST',
      body: JSON.stringify(song),
    });
    return songs;
  },

  unlikeSong: async (videoId: string): Promise<LikedSong[]> => {
    const { songs } = await request<{ songs: LikedSong[] }>(
      `/api/liked-songs/${encodeURIComponent(videoId)}`,
      { method: 'DELETE' },
    );
    return songs;
  },

  /** One-shot migration of a browser's localStorage cache into the database. */
  syncLikedSongs: async (songs: LikedSong[]): Promise<LikedSong[]> => {
    const result = await request<{ songs: LikedSong[] }>('/api/liked-songs', {
      method: 'PUT',
      body: JSON.stringify({ songs }),
    });
    return result.songs;
  },

  recordPlay: (song: LikedSong) =>
    request<void>('/api/history', {
      method: 'POST',
      body: JSON.stringify(song),
    }),

  getLyrics: (videoId: string) => request<Lyrics>(`/api/songs/${encodeURIComponent(videoId)}/lyrics`),

  getHistory: async (limit = 50): Promise<LikedSong[]> => {
    const { songs } = await request<{ songs: LikedSong[] }>(`/api/history?limit=${limit}`);
    return songs;
  },

  getPlaylists: async (): Promise<UserPlaylist[]> => {
    const { playlists } = await request<{ playlists: UserPlaylist[] }>('/api/playlists');
    return playlists;
  },

  createPlaylist: async (name: string): Promise<UserPlaylist> => {
    const { playlist } = await request<{ playlist: UserPlaylist }>('/api/playlists', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return playlist;
  },

  renamePlaylist: async (id: string, name: string): Promise<UserPlaylist> => {
    const { playlist } = await request<{ playlist: UserPlaylist }>(
      `/api/playlists/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify({ name }) },
    );
    return playlist;
  },

  deletePlaylist: (id: string) =>
    request<void>(`/api/playlists/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  addSongToPlaylist: async (id: string, song: LikedSong): Promise<UserPlaylist> => {
    const { playlist } = await request<{ playlist: UserPlaylist }>(
      `/api/playlists/${encodeURIComponent(id)}/songs`,
      { method: 'POST', body: JSON.stringify(song) },
    );
    return playlist;
  },

  removeSongFromPlaylist: async (id: string, videoId: string): Promise<UserPlaylist> => {
    const { playlist } = await request<{ playlist: UserPlaylist }>(
      `/api/playlists/${encodeURIComponent(id)}/songs/${encodeURIComponent(videoId)}`,
      { method: 'DELETE' },
    );
    return playlist;
  },
};
