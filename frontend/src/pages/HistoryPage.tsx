import { api } from '@/api/client';
import { HeartIcon } from '@/components/HeartIcon';
import { EmptyMessage, ErrorMessage, Loading } from '@/components/StatusMessage';
import { useAsync } from '@/hooks/useAsync';
import { usePlayer } from '@/player/PlayerContext';
import { handleThumbnailError, thumbnailOrFallback } from '@/utils/format';

/**
 * A genuinely new page, not a port of anything in the original templates --
 * the sidebar's "folder-closed" icon was decorative in both the original
 * layout and the first cut of this rebuild. `GET /api/history` already
 * existed and was already being written to on every play; nothing read it
 * back until now.
 *
 * New markup rather than reusing SongRow/.first_song_row: those classes only
 * have rules scoped under `.homepage`/`.searchpage` in the ported
 * stylesheets, so they'd render unstyled here.
 */
export function HistoryPage() {
  const { data, loading, error } = useAsync(() => api.getHistory(50), []);
  const { playTrack } = usePlayer();
  const songs = data ?? [];

  return (
    <div className="historypage">
      <h1>Recently Played</h1>
      <div className="historypage_list">
        {loading && songs.length === 0 && <Loading label="Loading your play history…" />}
        {error && songs.length === 0 && <ErrorMessage message={error} />}
        {!loading && !error && songs.length === 0 && (
          <EmptyMessage message="Nothing played yet. Your history fills in as you listen." />
        )}
        {songs.map((song, index) => (
          <div className="historypage_row" key={`${song.videoId}-${index}`}>
            <div
              className="historypage_row_main"
              role="button"
              tabIndex={0}
              aria-label={`Play ${song.title} by ${song.artist}`}
              onClick={() => playTrack(song)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  playTrack(song);
                }
              }}
            >
              <img
                src={thumbnailOrFallback(song.thumbnail)}
                alt=""
                loading="lazy"
                onError={(event) => handleThumbnailError(event, song.videoId)}
              />
              <div className="historypage_row_text">
                <p className="historypage_row_title">{song.title}</p>
                <p className="historypage_row_artist">{song.artist}</p>
              </div>
            </div>
            <HeartIcon song={song} />
          </div>
        ))}
      </div>
    </div>
  );
}
