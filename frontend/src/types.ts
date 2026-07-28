/**
 * Shapes returned by the Flask API.
 *
 * The original templates read raw ytmusicapi dicts directly in Jinja, e.g.
 * `song['thumbnails'][song['thumbnails']|length-1]['url']`. The backend now
 * flattens everything into these types, so there is exactly one place where
 * upstream shape changes have to be absorbed.
 */

export interface Song {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string | null;
  album?: string | null;
  duration?: string | null;
  durationSeconds?: number | null;
}

export interface Album {
  browseId: string | null;
  playlistId: string | null;
  title: string;
  artist: string;
  year?: string | null;
  thumbnail: string | null;
}

export interface Artist {
  browseId: string | null;
  name: string;
  subscribers?: string | null;
  thumbnail: string | null;
}

export interface Playlist {
  browseId: string | null;
  playlistId: string | null;
  title: string;
  author: string;
  itemCount?: number | null;
  thumbnail: string | null;
}

export interface HomeFeed {
  quickPicks: Song[];
  newReleases: Album[];
  recommendedMusic: Song[];
  genres: string[];
  moods: string[];
  /** 'get_home' when authenticated, 'search' when using the anonymous stand-in. */
  source: 'get_home' | 'search';
}

export interface SearchResults {
  query: string;
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
}

/** A liked song only ever needs the fields we display in the Library. */
export type LikedSong = Pick<Song, 'videoId' | 'title' | 'artist' | 'thumbnail' | 'duration'>;

export interface Lyrics {
  available: boolean;
  lyrics: string | null;
  source: string | null;
}

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
