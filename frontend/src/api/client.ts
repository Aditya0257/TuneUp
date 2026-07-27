/**
 * Typed API client.
 *
 * Replaces the scattered `XMLHttpRequest` / bare `fetch` calls in the original
 * changePage.js, searchSong.js, fetchSongsWorker.js, musicPlayer.js and
 * updateLikedSongs.js -- each of which did its own error handling (or none).
 */
import type { HomeFeed, LikedSong, SearchResults, Song } from '@/types';

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
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (cause) {
    // Network-level failure: server down, DNS, CORS preflight rejected.
    throw new ApiError(
      `Could not reach the TuneUp API. Is the Flask server running? (${String(cause)})`,
      0,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload: unknown = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload
        ? String((payload as { detail: unknown }).detail)
        : response.statusText;
    throw new ApiError(detail, response.status);
  }

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
};
