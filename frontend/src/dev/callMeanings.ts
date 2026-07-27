/**
 * Plain-language "what is this call actually doing" lookup, keyed by
 * method + path pattern. This is the thing that makes the drawer's trail
 * more than a network tab: three lenses per known endpoint, plus the
 * server-side flow. Add an entry here whenever a new route is added --
 * an undocumented call just falls back to a generic description.
 */

export interface CallMeaning {
  user: string;
  dev: string;
  business: string;
  flow: string;
}

interface MeaningRule extends CallMeaning {
  method: string;
  pattern: RegExp;
}

const RULES: MeaningRule[] = [
  {
    method: 'GET',
    pattern: /^\/api\/home$/,
    user: 'Loading your home feed -- Quick Picks, New Releases, genres and moods.',
    dev: 'Fetch (or serve from cache) a normalised home feed from ytmusicapi.',
    business: 'The landing surface -- gets a listener into a song with zero typing.',
    flow: 'HomePage -> api.getHome() -> Flask /api/home -> YTMusicService.get_home() -> ytmusicapi',
  },
  {
    method: 'GET',
    pattern: /^\/api\/search/,
    user: 'Searching for what you typed.',
    dev: 'Fan out to ytmusicapi across songs/albums/artists/community_playlists, normalise each, cache by query.',
    business: 'The fallback when Quick Picks does not have what someone wants.',
    flow: 'SearchPage -> api.search() -> Flask /api/search -> YTMusicService.search() -> ytmusicapi (x4 filters)',
  },
  {
    method: 'GET',
    pattern: /^\/api\/songs\//,
    user: 'Looking up details for one track.',
    dev: 'Resolve a single videoId to the normalised Song shape (title/artist/thumbnail/duration).',
    business: 'Backs deep-linking and metadata refresh for a specific track.',
    flow: 'PlayerContext -> api.getSong() -> Flask /api/songs/<id> -> YTMusicService.get_song()',
  },
  {
    method: 'GET',
    pattern: /^\/api\/queue\/random/,
    user: 'Filling up the play queue automatically.',
    dev: 'Batch-fetch a page of random tracks from the seeded search-query pool to top up the queue.',
    business: 'Keeps playback going without the listener building a queue by hand.',
    flow: 'PlayerContext (queue refill) -> api.getRandomSongs() -> Flask /api/queue/random -> YTMusicService.get_random_songs()',
  },
  {
    method: 'GET',
    pattern: /^\/api\/liked-songs$/,
    user: 'Loading your liked songs.',
    dev: 'Read the liked-songs list from the store (Mongo or in-memory).',
    business: 'Personal library -- the reason to come back to the app.',
    flow: 'LikedSongsContext / LibraryPage -> api.getLikedSongs() -> Flask /api/liked-songs -> store.list_liked_songs()',
  },
  {
    method: 'POST',
    pattern: /^\/api\/liked-songs$/,
    user: 'Liking a track.',
    dev: 'Idempotent add to the liked-songs store; server is authoritative, no client-sent isLiked flag.',
    business: 'The core engagement signal -- what a listener wants to hear again.',
    flow: 'HeartIcon -> LikedSongsContext.toggleLike() -> api.likeSong() -> Flask POST /api/liked-songs -> store.add_liked_song()',
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/liked-songs\//,
    user: 'Unliking a track.',
    dev: 'Idempotent remove from the liked-songs store by videoId.',
    business: 'Keeps the library reflecting current taste, not a one-way list.',
    flow: 'HeartIcon -> LikedSongsContext.toggleLike() -> api.unlikeSong() -> Flask DELETE /api/liked-songs/<id> -> store.remove_liked_song()',
  },
  {
    method: 'PUT',
    pattern: /^\/api\/liked-songs$/,
    user: "Syncing your old browser's liked songs into your account.",
    dev: 'One-shot bulk replace, used to migrate a localStorage cache into the store.',
    business: 'Preserves a returning user\'s data across the v1 -> v2 migration.',
    flow: 'LikedSongsContext (migration) -> api.syncLikedSongs() -> Flask PUT /api/liked-songs -> store.replace_liked_songs()',
  },
  {
    method: 'POST',
    pattern: /^\/api\/history$/,
    user: 'Recording that you played this.',
    dev: 'Append-only play-history write, capped and read back for future "recently played" features.',
    business: 'Raw signal for any future recommendation or history feature.',
    flow: 'PlayerContext (on play) -> api.recordPlay() -> Flask POST /api/history -> store.record_play()',
  },
];

const GENERIC: CallMeaning = {
  user: 'Talking to the server.',
  dev: 'An API call without a registered description -- add one in dev/callMeanings.ts.',
  business: 'Unknown -- describe this endpoint to keep the drawer useful.',
  flow: 'Client -> Flask -> ?',
};

export function describeCall(method: string, path: string): CallMeaning {
  const withoutQuery = path.split('?')[0];
  const rule = RULES.find((r) => r.method === method.toUpperCase() && r.pattern.test(withoutQuery));
  return rule ?? GENERIC;
}
