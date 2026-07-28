import { api } from '@/api/client';
import { Skeleton } from '@/components/Skeleton';
import { EmptyMessage, ErrorMessage } from '@/components/StatusMessage';
import { useAsync } from '@/hooks/useAsync';
import { useLikedSongs } from '@/liked/LikedSongsContext';
import { handleThumbnailError, thumbnailOrFallback } from '@/utils/format';

/**
 * A genuinely new page -- the sidebar's plain "folder" icon previously just
 * scrolled to Library's small Playlists teaser, which is an in-page anchor
 * jump easy to miss (no page change, no active-state highlight). This is a
 * real destination: a fuller playlist grid, still backed by the same real
 * YouTube Music search (no fake data), seeded by your most-liked artist
 * when you have one.
 */
function topArtist(likedSongs: { artist: string }[]): string | null {
  const counts = new Map<string, number>();
  for (const song of likedSongs) {
    counts.set(song.artist, (counts.get(song.artist) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [artist, count] of counts) {
    if (count > bestCount) {
      best = artist;
      bestCount = count;
    }
  }
  return best;
}

export function PlaylistsPage() {
  const { likedSongs } = useLikedSongs();
  const query = topArtist(likedSongs) ?? 'Popular Music';
  const { data, loading, error } = useAsync(() => api.search(query, 24), [query], true);
  const playlists = data?.playlists ?? [];

  return (
    <div className="playlistspage">
      {/* Same drag-handle affordance every other page has -- missed on this
          page and History at first. */}
      <div className="test_div" title="Drag to reveal the queue and player">
        <div className="vl" />
      </div>
      <h1>Playlists</h1>
      <p className="playlistspage_subtitle">
        {topArtist(likedSongs)
          ? `Playlists related to ${topArtist(likedSongs)}, your most-liked artist.`
          : 'Like a few songs to get playlists tailored to your taste.'}
      </p>

      {error && (
        <ErrorMessage message={error} hint="Check that the Flask backend is running and reachable." />
      )}
      {!loading && !error && playlists.length === 0 && (
        <EmptyMessage message="No playlists found right now." />
      )}

      <div className="playlistspage_grid">
        {loading &&
          !error &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <div className="playlistspage_card" key={i}>
              <Skeleton height="180px" radius="0" />
              <div style={{ padding: '10px 12px 12px' }}>
                <Skeleton width="80%" height="14px" />
                <div style={{ height: 6 }} />
                <Skeleton width="50%" height="11px" />
              </div>
            </div>
          ))}
        {playlists.map((playlist) => {
          const id = playlist.playlistId ?? playlist.browseId;
          return (
            <a
              className="playlistspage_card"
              key={id ?? playlist.title}
              href={id ? `https://music.youtube.com/playlist?list=${id}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!id || undefined}
              onClick={(event) => {
                if (!id) event.preventDefault();
              }}
            >
              <img
                src={thumbnailOrFallback(playlist.thumbnail)}
                alt=""
                loading="lazy"
                onError={handleThumbnailError}
              />
              <p className="playlistspage_card_title">{playlist.title}</p>
              {playlist.author && <p className="playlistspage_card_author">{playlist.author}</p>}
            </a>
          );
        })}
      </div>
    </div>
  );
}
