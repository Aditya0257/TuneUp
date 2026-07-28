import { api } from '@/api/client';
import { HeartIcon } from '@/components/HeartIcon';
import { Skeleton } from '@/components/Skeleton';
import { EmptyMessage, ErrorMessage } from '@/components/StatusMessage';
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
      {/* Same drag-handle affordance every other page has for revealing the
          queue/player panel -- missed on this page and Playlists at first. */}
      <div className="test_div">
        <div className="vl" />
      </div>
      <h1>Recently Played</h1>
      <div className="historypage_list">
        {error && songs.length === 0 && (
          <ErrorMessage message={error} hint="Check that the Flask backend is running and reachable." />
        )}
        {loading && songs.length === 0 && !error
          ? [0, 1, 2, 3, 4].map((i) => (
              <div className="tuneup_skeleton_row" key={i}>
                <Skeleton width="48px" height="48px" radius="8px" />
                <div className="tuneup_skeleton_text_col">
                  <Skeleton width="55%" height="16px" />
                  <Skeleton width="35%" height="12px" />
                </div>
              </div>
            ))
          : null}
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
